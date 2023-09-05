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
			data: configuration.getMilestone(0).activeValidators,
			found: true,
			height: 0,
		},
	];

	let nextMilestone = configuration.getNextMilestoneWithNewKey(0, "activeValidators");

	while (nextMilestone.found) {
		milestones.push(nextMilestone);
		nextMilestone = configuration.getNextMilestoneWithNewKey(nextMilestone.height, "activeValidators");
	}

	return milestones;
};
