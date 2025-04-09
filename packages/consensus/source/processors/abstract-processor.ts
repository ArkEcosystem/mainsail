import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import dayjs from "dayjs";

@injectable()
export class AbstractProcessor {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Consensus.CommitLock)
	protected readonly commitLock!: Contracts.Kernel.Lock;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.BlockchainUtils.TimestampCalculator)
	private readonly timestampCalculator!: Contracts.BlockchainUtils.TimestampCalculator;

	protected hasValidBlockNumberOrRound(message: { blockNumber: number; round: number }): boolean {
		return (
			message.blockNumber === this.getConsensus().getBlockNumber() &&
			message.round >= this.getConsensus().getRound()
		);
	}

	protected isRoundInBounds(message: { round: number }): boolean {
		const earliestTime =
			this.timestampCalculator.calculateMinimalTimestamp(this.stateStore.getLastBlock(), message.round) - 500; // Allow time drift between nodes

		return dayjs().isAfter(dayjs(earliestTime));
	}

	protected getConsensus(): Contracts.Consensus.Service {
		return this.app.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service);
	}
}
