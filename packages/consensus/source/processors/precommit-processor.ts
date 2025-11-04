import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { AbstractProcessor } from "./abstract-processor.js";

@injectable()
export class PrecommitProcessor extends AbstractProcessor implements Contracts.Consensus.PrecommitProcessor {
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

	#pendingPrecommits: Set<string> = new Set();

	async process(
		precommit: Contracts.Crypto.Precommit,
		broadcast = true,
	): Promise<Contracts.Consensus.ProcessorResult> {
		return this.commitLock.runNonExclusive(async () => {
			if (!this.hasValidBlockNumberOrRound(precommit)) {
				return Contracts.Consensus.ProcessorResult.Skipped;
			}

			if (!this.isRoundInBounds(precommit)) {
				return Contracts.Consensus.ProcessorResult.Invalid;
			}


			// Check round state for existing prevotes
			const roundState = this.roundStateRepo.getRoundState(precommit.blockNumber, precommit.round);
			if (roundState.hasPrecommit(precommit.validatorIndex)) {
				const existingPrecommit = roundState.getPrecommit(precommit.validatorIndex);
				if (existingPrecommit && !existingPrecommit.serialized.equals(precommit.serialized)) {
					this.logger.warn(`Conflicting precommits for validator index ${precommit.validatorIndex} in block ${precommit.blockNumber}/${precommit.round}. Existing: ${existingPrecommit.serialized.toString("hex")}, New: ${precommit.serialized.toString("hex")}`);
				}

				return Contracts.Consensus.ProcessorResult.Skipped;
			}

			// Check pending precommits to prevent processing the same precommit multiple times
			const serializedHex = precommit.serialized.toString("hex");
			if (this.#pendingPrecommits.has(serializedHex)) {
				return Contracts.Consensus.ProcessorResult.Skipped;
			}
			this.#pendingPrecommits.add(serializedHex);


			// Check if the precommit has a valid signature
			const hasValidSignature = await this.#hasValidSignature(precommit);

			// Remove from pending precommits after processing
			this.#pendingPrecommits.delete(serializedHex);

			if (!hasValidSignature) {
				return Contracts.Consensus.ProcessorResult.Invalid;
			}

			roundState.addPrecommit(precommit);

			if (broadcast) {
				void this.broadcaster.broadcastPrecommit(precommit);
			}

			void this.getConsensus().handle(roundState);

			return Contracts.Consensus.ProcessorResult.Accepted;
		});
	}

	async #hasValidSignature(precommit: Contracts.Crypto.Precommit): Promise<boolean> {
		const worker = await this.workerPool.getWorker();
		return worker.consensusSignature(
			"verify",
			Buffer.from(precommit.signature, "hex"),
			await this.serializer.serializePrecommitForSignature(precommit),
			Buffer.from(this.validatorSet.getValidator(precommit.validatorIndex).blsPublicKey, "hex"),
		);
	}
}
