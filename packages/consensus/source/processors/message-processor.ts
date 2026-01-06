import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";

import { AbstractProcessor } from "./abstract-processor.js";

enum SignatureCheckResult {
	Skip,
	Invalid,
	Accepted,
}

@injectable()
export class MessageProcessor extends AbstractProcessor implements Contracts.Consensus.MessageProcessor {
	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.MessageSerializer;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: Contracts.Consensus.RoundStateRepository;

	@inject(Identifiers.P2P.Broadcaster)
	private readonly broadcaster!: Contracts.P2P.Broadcaster;

	@inject(Identifiers.CryptoWorker.WorkerPool)
	private readonly workerPool!: Contracts.Crypto.WorkerPool;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	#pendingMessages: Map<string, ((value: SignatureCheckResult) => void)[]> = new Map();

	async process(
		message: Contracts.Crypto.Message,
		broadcast: boolean = true,
	): Promise<Contracts.Consensus.ProcessorResult> {
		return this.commitLock.runNonExclusive(async () => {
			if (!this.hasValidBlockNumberOrRound(message)) {
				return Enums.Consensus.ProcessorResult.Skipped;
			}

			if (!this.isRoundInBounds(message)) {
				return Enums.Consensus.ProcessorResult.Invalid;
			}

			const roundState = this.roundStateRepo.getRoundState(message.blockNumber, message.round);
			if (roundState.hasMessage(message)) {
				const existingMessage = roundState.getMessage(message.validatorIndex, message.type);
				if (existingMessage && !existingMessage.serialized.equals(message.serialized)) {
					this.logger.warn(
						`Conflicting ${message.type === Enums.Crypto.MessageType.Prevote ? "prevote" : "precommit"} for validator index ${message.validatorIndex} in block ${message.blockNumber}/${message.round}. Existing: ${existingMessage.serialized.toString("hex")}, New: ${message.serialized.toString("hex")}`,
					);
				}

				return Enums.Consensus.ProcessorResult.Skipped;
			}

			switch (await this.#signatureCheck(message)) {
				case SignatureCheckResult.Skip: {
					return Enums.Consensus.ProcessorResult.Skipped;
				}
				case SignatureCheckResult.Invalid: {
					return Enums.Consensus.ProcessorResult.Invalid;
				}
			}

			roundState.addMessage(message);

			if (broadcast) {
				if (message.type === Enums.Crypto.MessageType.Prevote) {
					void this.broadcaster.broadcastPrevote(message);
				} else {
					void this.broadcaster.broadcastPrecommit(message);
				}
			}

			void this.getConsensus().handle(roundState);

			return Enums.Consensus.ProcessorResult.Accepted;
		});
	}

	async #signatureCheck(message: Contracts.Crypto.Message): Promise<SignatureCheckResult> {
		const serializedHex = message.serialized.toString("hex");
		if (this.#pendingMessages.has(serializedHex)) {
			return new Promise((resolve) => {
				const pendingMessages = this.#pendingMessages.get(serializedHex);
				assert.defined(pendingMessages);
				pendingMessages.push(resolve);
			});
		} else {
			this.#pendingMessages.set(serializedHex, []);
		}

		const hasValidSignature = await this.#hasValidSignature(message);

		const pendingMessages = this.#pendingMessages.get(serializedHex);
		assert.defined(pendingMessages);
		for (const resolve of pendingMessages) {
			resolve(hasValidSignature ? SignatureCheckResult.Skip : SignatureCheckResult.Invalid);
		}

		this.#pendingMessages.delete(serializedHex);

		return hasValidSignature ? SignatureCheckResult.Accepted : SignatureCheckResult.Invalid;
	}

	async #hasValidSignature(message: Contracts.Crypto.Message): Promise<boolean> {
		const worker = await this.workerPool.getWorker();
		return worker.consensusSignature(
			"verify",
			Buffer.from(message.signature, "hex"),
			await this.serializer.serializeMessageForSignature(message),
			Buffer.from(this.validatorSet.getValidator(message.validatorIndex).blsPublicKey, "hex"),
		);
	}
}
