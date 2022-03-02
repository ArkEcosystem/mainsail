import { Crypto, Shared } from "@arkecosystem/core-contracts";
import { InvalidMilestoneConfigurationError } from "@arkecosystem/core-errors";

import { getMilestonesWhichAffectActiveDelegateCount } from "./calculate-forging-info";

export const isNewRound = (height: number, configuration: Crypto.IConfiguration): boolean => {
	const milestones = configuration.get("milestones");

	// Since milestones are merged, find the first milestone to introduce the delegate count.
	let milestone;
	for (let index = milestones.length - 1; index >= 0; index--) {
		const temporary = milestones[index];
		if (temporary.height > height) {
			continue;
		}

		if (!milestone || temporary.activeDelegates === milestone.activeDelegates) {
			milestone = temporary;
		} else {
			break;
		}
	}

	return height === 1 || (height - milestone.height) % milestone.activeDelegates === 0;
};

export const calculateRound = (height: number, configuration: Crypto.IConfiguration): Shared.RoundInfo => {
	const result: Shared.RoundInfo = {
		maxDelegates: 0,
		nextRound: 0,
		round: 1,
		roundHeight: 1,
	};

	let nextMilestone = configuration.getNextMilestoneWithNewKey(1, "activeDelegates");
	let activeDelegates = configuration.getMilestone(1).activeDelegates;
	let milestoneHeight = 1;

	const milestones = getMilestonesWhichAffectActiveDelegateCount(configuration);

	for (let index = 0; index < milestones.length - 1; index++) {
		if (height < nextMilestone.height) {
			break;
		}

		const spanHeight = nextMilestone.height - milestoneHeight;
		if (spanHeight % activeDelegates !== 0) {
			throw new InvalidMilestoneConfigurationError(
				`Bad milestone at height: ${height}. The number of delegates can only be changed at the beginning of a new round.`,
			);
		}

		result.round += spanHeight / activeDelegates;
		result.roundHeight = nextMilestone.height;
		result.maxDelegates = nextMilestone.data;

		activeDelegates = nextMilestone.data;
		milestoneHeight = nextMilestone.height;

		nextMilestone = configuration.getNextMilestoneWithNewKey(nextMilestone.height, "activeDelegates");
	}

	const heightFromLastSpan = height - milestoneHeight;
	const roundIncrease = Math.floor(heightFromLastSpan / activeDelegates);
	const nextRoundIncrease = (heightFromLastSpan + 1) % activeDelegates === 0 ? 1 : 0;

	result.round += roundIncrease;
	result.roundHeight += roundIncrease * activeDelegates;
	result.nextRound = result.round + nextRoundIncrease;
	result.maxDelegates = activeDelegates;

	return result;
};
