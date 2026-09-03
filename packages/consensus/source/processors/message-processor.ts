import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { AbstractProcessor } from "./abstract-processor.js";

enum SignatureCheckResult {
	Skip,
	Invalid,
	Accepted,
}

type PendingSignatureCheck = {
	reject: (error: unknown) => void;
	resolve: (result: SignatureCheckResult) => void;
};

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

	#pendingMessages = new Map<string, PendingSignatureCheck[]>();

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
			if (this.#hasMessage(roundState, message)) {
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

			// A different message of the same validator may have been added while the signature was verified.
			if (this.#hasMessage(roundState, message)) {
				return Enums.Consensus.ProcessorResult.Skipped;
			}

			roundState.addMessage(message);

			if (broadcast) {
				void this.broadcaster.broadcastMessage(message);
			}

			this.handleRoundState(roundState);

			return Enums.Consensus.ProcessorResult.Accepted;
		});
	}

	#hasMessage(roundState: Contracts.Consensus.RoundState, message: Contracts.Crypto.Message): boolean {
		if (!roundState.hasMessage(message)) {
			return false;
		}

		const existingMessage = roundState.getMessage(message.validatorIndex, message.type);
		if (existingMessage && !existingMessage.serialized.equals(message.serialized)) {
			this.logger.warn(
				`Conflicting ${message.type === Enums.Crypto.MessageType.Prevote ? "prevote" : "precommit"} for validator index ${message.validatorIndex} in block ${message.blockNumber}/${message.round}. Existing: ${existingMessage.serialized.toString("hex")}, New: ${message.serialized.toString("hex")}`,
				"consensus",
			);
		}

		return true;
	}

	async #signatureCheck(message: Contracts.Crypto.Message): Promise<SignatureCheckResult> {
		const serializedHex = message.serialized.toString("hex");

		const pendingMessages = this.#pendingMessages.get(serializedHex);
		if (pendingMessages) {
			// An identical message is already being verified; share its outcome instead of verifying it again.
			return new Promise((resolve, reject) => {
				pendingMessages.push({ reject, resolve });
			});
		}

		this.#pendingMessages.set(serializedHex, []);

		let hasValidSignature: boolean;
		try {
			hasValidSignature = await this.#hasValidSignature(message);
		} catch (error) {
			// Fail the waiting copies the same way, otherwise they would never settle and the
			// non-exclusive commit lock they hold would block every future commit.
			for (const { reject } of this.#takePendingMessages(serializedHex)) {
				reject(error);
			}

			throw error;
		}

		for (const { resolve } of this.#takePendingMessages(serializedHex)) {
			resolve(hasValidSignature ? SignatureCheckResult.Skip : SignatureCheckResult.Invalid);
		}

		return hasValidSignature ? SignatureCheckResult.Accepted : SignatureCheckResult.Invalid;
	}

	#takePendingMessages(serializedHex: string): PendingSignatureCheck[] {
		const pendingMessages = this.#pendingMessages.get(serializedHex) ?? [];
		this.#pendingMessages.delete(serializedHex);

		return pendingMessages;
	}

	async #hasValidSignature(message: Contracts.Crypto.Message): Promise<boolean> {
		const worker = this.workerPool.getWorker();
		return worker.consensusSignature(
			"verify",
			Buffer.from(message.signature, "hex"),
			await this.serializer.serializeMessageForSignature(message.toData(), {
				genesisBlockHash: this.stateStore.getGenesisCommit().block.hash,
				previousBlockHash: this.stateStore.getLastBlock().hash,
			}),
			Buffer.from(this.validatorSet.getValidator(message.validatorIndex).blsPublicKey, "hex"),
		);
	}
}
