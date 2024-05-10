import { Contracts } from "@mainsail/contracts";

export const calculateMinimalTimestamp = (
	previousBlock: Contracts.Crypto.Block,
	round: number,
	configuration: Contracts.Crypto.Configuration,
): number => {
	// Hard limit to prevent overflow
	if (round > 100_000) {
		throw new Error(`Round ${round} is too high`);
	}

	const milestone = configuration.getMilestone(previousBlock.data.height + 1);
	const roundForMath = Math.max(0, round - 1);

	return (
		previousBlock.data.timestamp +
		// Append block time
		milestone.timeouts.blockTime +
		// Round timeout without increase
		round * milestone.timeouts.stageTime +
		// Add increase for each round. Using arithmetic progression formula
		0.5 *
			roundForMath *
			(2 * milestone.timeouts.stageTimeIncrease + (roundForMath - 1) * milestone.timeouts.stageTimeIncrease)
	);
};
