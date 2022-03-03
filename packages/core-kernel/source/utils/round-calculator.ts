import { Contracts, Exceptions } from "@arkecosystem/core-contracts";

import { getMilestonesWhichAffectActiveValidatorCount } from "./calculate-forging-info";

export const isNewRound = (height: number, configuration: Contracts.Crypto.IConfiguration): boolean => {
	const milestones = configuration.get("milestones");

	// Since milestones are merged, find the first milestone to introduce the validator count.
	let milestone;
	for (let index = milestones.length - 1; index >= 0; index--) {
		const temporary = milestones[index];
		if (temporary.height > height) {
			continue;
		}

		if (!milestone || temporary.activeValidators === milestone.activeValidators) {
			milestone = temporary;
		} else {
			break;
		}
	}

	return height === 1 || (height - milestone.height) % milestone.activeValidators === 0;
};

export const calculateRound = (
	height: number,
	configuration: Contracts.Crypto.IConfiguration,
): Contracts.Shared.RoundInfo => {
	const result: Contracts.Shared.RoundInfo = {
		maxValidators: 0,
		nextRound: 0,
		round: 1,
		roundHeight: 1,
	};

	let nextMilestone = configuration.getNextMilestoneWithNewKey(1, "activeValidators");
	let activeValidators = configuration.getMilestone(1).activeValidators;
	let milestoneHeight = 1;

	const milestones = getMilestonesWhichAffectActiveValidatorCount(configuration);

	for (let index = 0; index < milestones.length - 1; index++) {
		if (height < nextMilestone.height) {
			break;
		}

		const spanHeight = nextMilestone.height - milestoneHeight;
		if (spanHeight % activeValidators !== 0) {
			throw new Exceptions.InvalidMilestoneConfigurationError(
				`Bad milestone at height: ${height}. The number of validators can only be changed at the beginning of a new round.`,
			);
		}

		result.round += spanHeight / activeValidators;
		result.roundHeight = nextMilestone.height;
		result.maxValidators = nextMilestone.data;

		activeValidators = nextMilestone.data;
		milestoneHeight = nextMilestone.height;

		nextMilestone = configuration.getNextMilestoneWithNewKey(nextMilestone.height, "activeValidators");
	}

	const heightFromLastSpan = height - milestoneHeight;
	const roundIncrease = Math.floor(heightFromLastSpan / activeValidators);
	const nextRoundIncrease = (heightFromLastSpan + 1) % activeValidators === 0 ? 1 : 0;

	result.round += roundIncrease;
	result.roundHeight += roundIncrease * activeValidators;
	result.nextRound = result.round + nextRoundIncrease;
	result.maxValidators = activeValidators;

	return result;
};
