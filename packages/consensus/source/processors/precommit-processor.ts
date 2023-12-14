import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { IpcWorker } from "@mainsail/kernel";

import { AbstractProcessor } from "./abstract-processor";

@injectable()
export class PrecommitProcessor extends AbstractProcessor implements Contracts.Consensus.IPrecommitProcessor {
	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.IMessageSerializer;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: Contracts.Consensus.IRoundStateRepository;

	@inject(Identifiers.PeerBroadcaster)
	private readonly broadcaster!: Contracts.P2P.Broadcaster;

	@inject(Identifiers.Ipc.WorkerPool)
	private readonly workerPool!: IpcWorker.WorkerPool;

	async process(
		precommit: Contracts.Crypto.IPrecommit,
		broadcast = true,
	): Promise<Contracts.Consensus.ProcessorResult> {
		return this.commitLock.runNonExclusive(async () => {
			if (!this.hasValidHeightOrRound(precommit)) {
				return Contracts.Consensus.ProcessorResult.Skipped;
			}

			if (!(await this.#hasValidSignature(precommit))) {
				return Contracts.Consensus.ProcessorResult.Invalid;
			}

			const roundState = this.roundStateRepo.getRoundState(precommit.height, precommit.round);
			if (roundState.hasPrecommit(precommit.validatorIndex)) {
				return Contracts.Consensus.ProcessorResult.Skipped;
			}

			roundState.addPrecommit(precommit);

			if (broadcast) {
				void this.broadcaster.broadcastPrecommit(precommit);
			}

			void this.getConsensus().handle(roundState);

			return Contracts.Consensus.ProcessorResult.Accepted;
		});
	}

	async #hasValidSignature(precommit: Contracts.Crypto.IPrecommit): Promise<boolean> {
		const worker = await this.workerPool.getWorker();
		return worker.consensusSignature(
			"verify",
			Buffer.from(precommit.signature, "hex"),
			await this.serializer.serializePrecommitForSignature(precommit),
			Buffer.from(this.validatorSet.getValidator(precommit.validatorIndex).getConsensusPublicKey(), "hex"),
		);
	}
}
