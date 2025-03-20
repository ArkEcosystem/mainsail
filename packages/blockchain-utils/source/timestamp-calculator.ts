import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class TimestampCalculator implements Contracts.BlockchainUtils.TimestampCalculator {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	calculateMinimalTimestamp = (previousBlock: Contracts.Crypto.Block, round: number): number => {
		// Hard limit to prevent overflow
		if (round > 100_000) {
			throw new Error(`Round ${round} is too high`);
		}

		const milestone = this.configuration.getMilestone(previousBlock.data.number + 1);
		const roundForMath = Math.max(0, round - 1);

		return (
			previousBlock.data.timestamp +
			// Append block time
			milestone.timeouts.blockTime +
			// Round timeout without increase
			round * milestone.timeouts.stageTimeout +
			// Add increase for each round. Using arithmetic progression formula
			0.5 *
				roundForMath *
				(2 * milestone.timeouts.stageTimeoutIncrease +
					(roundForMath - 1) * milestone.timeouts.stageTimeoutIncrease)
		);
	};
}
