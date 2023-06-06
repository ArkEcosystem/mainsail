import { Contracts } from "@mainsail/contracts";

export interface MilestoneSearchResult {
	found: boolean;
	height: number;
	data: any;
}

export const getMilestonesWhichAffectActiveValidatorCount = (
	configuration: Contracts.Crypto.IConfiguration,
): Array<MilestoneSearchResult> => {
	const milestones: Array<MilestoneSearchResult> = [
		{
			data: configuration.getMilestone(1).activeValidators,
			found: true,
			height: 1,
		},
	];

	let nextMilestone = configuration.getNextMilestoneWithNewKey(1, "activeValidators");

	while (nextMilestone.found) {
		milestones.push(nextMilestone);
		nextMilestone = configuration.getNextMilestoneWithNewKey(nextMilestone.height, "activeValidators");
	}

	return milestones;
};
