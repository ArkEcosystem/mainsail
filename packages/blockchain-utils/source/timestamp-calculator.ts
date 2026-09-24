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

		// r * (r + 1) is a product of two consecutive integers and therefore even, so with integer milestone
		// timeouts the division by 2 is exact. Math.floor only guards the timestamp against a non-integer result.
		const increases = Math.floor((stageTimeoutIncrease * previousRounds * (previousRounds + 1)) / 2);

		return previousBlock.timestamp + blockTime + round * stageTimeout + increases;
	}
}
