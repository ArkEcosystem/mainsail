import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";
import dayjs from "dayjs";

@injectable()
export class AbstractProcessor {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Consensus.CommitLock)
	protected readonly commitLock!: Contracts.Kernel.Lock;

	@inject(Identifiers.State.Store)
	protected readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.BlockchainUtils.TimestampCalculator)
	private readonly timestampCalculator!: Contracts.BlockchainUtils.TimestampCalculator;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

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

	protected handleRoundState(roundState: Contracts.Consensus.RoundState): void {
		this.getConsensus()
			.handle(roundState)
			.catch((rawError: unknown) => {
				const error = ensureError(rawError);

				this.logger.error(
					`Failed to handle round state ${roundState.blockNumber}/${roundState.round}: ${error.stack ?? error.message}`,
					"consensus",
				);
			});
	}

	protected getConsensus(): Contracts.Consensus.Service {
		return this.app.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service);
	}
}
