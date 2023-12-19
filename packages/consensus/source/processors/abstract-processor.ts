import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import dayjs from "dayjs";

@injectable()
export class AbstractProcessor {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Consensus.CommitLock)
	protected readonly commitLock!: Contracts.Kernel.Lock;

	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	protected hasValidHeightOrRound(message: { height: number; round: number }): boolean {
		return message.height === this.getConsensus().getHeight() && message.round >= this.getConsensus().getRound();
	}

	protected isRoundInBounds(message: { round: number }): boolean {
		const milestone = this.cryptoConfiguration.getMilestone();
		const lastBlockTimestamp = this.stateService.getStateStore().getLastBlock().data.timestamp;

		// Skip stageTimeoutIncrease for first round.
		const round = Math.max(0, message.round - 1);

		const earliestTime =
			// Last block time
			lastBlockTimestamp +
			// Append block time
			milestone.blockTime +
			// Round timeout without increase
			message.round * milestone.stageTimeout +
			// Add increase for each round. Using arithmetic progression formula
			0.5 * round * (2 * milestone.stageTimeoutIncrease + (round - 1) * milestone.stageTimeoutIncrease);

		return dayjs().isAfter(dayjs(earliestTime));
	}

	protected getConsensus(): Contracts.Consensus.ConsensusService {
		return this.app.get<Contracts.Consensus.ConsensusService>(Identifiers.Consensus.Service);
	}
}
