import { Enums, Identifiers, Locale } from "@mainsail/constants";
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
export class PrevoteProcessor extends AbstractProcessor implements Contracts.Consensus.PrevoteProcessor {
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

	#pendingPrevotes: Map<string, ((value: SignatureCheckResult) => void)[]> = new Map();

	async process(prevote: Contracts.Crypto.Message, broadcast = true): Promise<Contracts.Consensus.ProcessorResult> {
		return this.commitLock.runNonExclusive(async () => {
			if (!this.hasValidBlockNumberOrRound(prevote)) {
				return Enums.Consensus.ProcessorResult.Skipped;
			}

			if (!this.isRoundInBounds(prevote)) {
				return Enums.Consensus.ProcessorResult.Invalid;
			}

			const roundState = this.roundStateRepo.getRoundState(prevote.blockNumber, prevote.round);
			if (roundState.hasPrevote(prevote.validatorIndex)) {
				const existingPrevote = roundState.getPrevote(prevote.validatorIndex);
				assert.defined(existingPrevote);

				if (!existingPrevote.serialized.equals(prevote.serialized)) {
					this.logger.warn(
						`Conflicting prevotes for validator index ${prevote.validatorIndex} in block ${prevote.blockNumber.toLocaleString(Locale)}/${prevote.round}. Existing: ${existingPrevote.serialized.toString("hex")}, New: ${prevote.serialized.toString("hex")}`,
					);
				}

				return Enums.Consensus.ProcessorResult.Skipped;
			}

			switch (await this.#signatureCheck(prevote)) {
				case SignatureCheckResult.Skip: {
					return Enums.Consensus.ProcessorResult.Skipped;
				}
				case SignatureCheckResult.Invalid: {
					return Enums.Consensus.ProcessorResult.Invalid;
				}
			}

			roundState.addPrevote(prevote);

			if (broadcast) {
				void this.broadcaster.broadcastPrevote(prevote);
			}

			void this.getConsensus().handle(roundState);

			return Enums.Consensus.ProcessorResult.Accepted;
		});
	}

	async #signatureCheck(prevote: Contracts.Crypto.Message): Promise<SignatureCheckResult> {
		const serializedHex = prevote.serialized.toString("hex");
		if (this.#pendingPrevotes.has(serializedHex)) {
			return new Promise((resolve) => {
				this.#pendingPrevotes.get(serializedHex)!.push(resolve);
			});
		} else {
			this.#pendingPrevotes.set(serializedHex, []);
		}

		const hasValidSignature = await this.#hasValidSignature(prevote);

		for (const resolve of this.#pendingPrevotes.get(serializedHex)!) {
			resolve(hasValidSignature ? SignatureCheckResult.Skip : SignatureCheckResult.Invalid);
		}

		this.#pendingPrevotes.delete(serializedHex);

		return hasValidSignature ? SignatureCheckResult.Accepted : SignatureCheckResult.Invalid;
	}

	async #hasValidSignature(prevote: Contracts.Crypto.Message): Promise<boolean> {
		const worker = await this.workerPool.getWorker();
		return worker.consensusSignature(
			"verify",
			Buffer.from(prevote.signature, "hex"),
			await this.serializer.serializePrevoteForSignature(prevote),
			Buffer.from(this.validatorSet.getValidator(prevote.validatorIndex).blsPublicKey, "hex"),
		);
	}
}
