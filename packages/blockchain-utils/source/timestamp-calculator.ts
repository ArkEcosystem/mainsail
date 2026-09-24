import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class TimestampCalculator implements Contracts.BlockchainUtils.TimestampCalculator {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public calculateMinimalTimestamp(previousBlock: Contracts.Crypto.Block, round: number): number {
		// Hard limit to prevent overflow
		if (round > 100_000) {
			throw new Error(`Round ${round} is too high`);
		}

		const { blockTime, stageTimeout, stageTimeoutIncrease } = this.configuration.getMilestone(
			previousBlock.number + 1,
		).timeouts;

		const previousRounds = Math.max(0, round - 1);

		return (
			previousBlock.timestamp +
			blockTime +
			round * stageTimeout +
			(stageTimeoutIncrease * previousRounds * (previousRounds + 1)) / 2
		);
	}
}
