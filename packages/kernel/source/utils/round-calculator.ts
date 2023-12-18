import { Contracts, Exceptions } from "@mainsail/contracts";

import { assert } from "./assert";
import { getMilestonesWhichAffectActiveValidatorCount } from "./calculate-forging-info";

export const isNewRound = (height: number, configuration: Contracts.Crypto.Configuration): boolean => {
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

	return height === 0 || (height - Math.max(milestone.height, 1)) % milestone.activeValidators === 0;
};

export const calculateRound = (
	height: number,
	configuration: Contracts.Crypto.Configuration,
): Contracts.Shared.RoundInfo => {
	let nextMilestone = configuration.getNextMilestoneWithNewKey(0, "activeValidators");
	let activeValidators = configuration.getMilestone(0).activeValidators;

	// Genesis round requires special treatment
	if (height === 0) {
		return { maxValidators: 0, nextRound: 1, round: 0, roundHeight: 0 };
	}

	const result: Contracts.Shared.RoundInfo = {
		maxValidators: 0,
		nextRound: 0,
		round: 1,
		roundHeight: 1,
	};

	let milestoneHeight = 0;

	const milestones = getMilestonesWhichAffectActiveValidatorCount(configuration);
	for (let index = 0; index < milestones.length - 1; index++) {
		if (height < nextMilestone.height) {
			break;
		}

		const spanHeight = nextMilestone.height - milestoneHeight - 1;
		if (spanHeight % activeValidators !== 0) {
			throw new Exceptions.InvalidMilestoneConfigurationError(
				`Bad milestone at height: ${height}. The number of validators can only be changed at the beginning of a new round.`,
			);
		}

		result.round += spanHeight / activeValidators;
		result.roundHeight = nextMilestone.height;
		assert.defined<number>(nextMilestone.data);
		result.maxValidators = nextMilestone.data;

		activeValidators = nextMilestone.data;
		milestoneHeight = nextMilestone.height - 1;

		nextMilestone = configuration.getNextMilestoneWithNewKey(nextMilestone.height, "activeValidators");
	}

	const heightFromLastSpan = height - milestoneHeight - 1;
	const roundIncrease = Math.floor(heightFromLastSpan / activeValidators);
	const nextRoundIncrease = (heightFromLastSpan + 1) % activeValidators === 0 ? 1 : 0;

	result.round += roundIncrease;
	result.roundHeight += roundIncrease * activeValidators;
	result.nextRound = result.round + nextRoundIncrease;
	result.maxValidators = activeValidators;

	return result;
};
