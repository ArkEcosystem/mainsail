import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { IpcWorker } from "@mainsail/kernel";

import { AbstractProcessor } from "./abstract-processor.js";

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
	private readonly workerPool!: IpcWorker.WorkerPool;

	async process(prevote: Contracts.Crypto.Prevote, broadcast = true): Promise<Contracts.Consensus.ProcessorResult> {
		return this.commitLock.runNonExclusive(async () => {
			if (!this.hasValidHeightOrRound(prevote)) {
				return Contracts.Consensus.ProcessorResult.Skipped;
			}

			if (!this.isRoundInBounds(prevote)) {
				return Contracts.Consensus.ProcessorResult.Invalid;
			}

			if (!(await this.#hasValidSignature(prevote))) {
				return Contracts.Consensus.ProcessorResult.Invalid;
			}

			const roundState = this.roundStateRepo.getRoundState(prevote.height, prevote.round);
			if (roundState.hasPrevote(prevote.validatorIndex)) {
				return Contracts.Consensus.ProcessorResult.Skipped;
			}

			roundState.addPrevote(prevote);

			if (broadcast) {
				void this.broadcaster.broadcastPrevote(prevote);
			}

			void this.getConsensus().handle(roundState);

			return Contracts.Consensus.ProcessorResult.Accepted;
		});
	}

	async #hasValidSignature(prevote: Contracts.Crypto.Prevote): Promise<boolean> {
		const worker = await this.workerPool.getWorker();
		return worker.consensusSignature(
			"verify",
			Buffer.from(prevote.signature, "hex"),
			await this.serializer.serializePrevoteForSignature(prevote),
			Buffer.from(this.validatorSet.getValidator(prevote.validatorIndex).getConsensusPublicKey(), "hex"),
		);
	}
}
