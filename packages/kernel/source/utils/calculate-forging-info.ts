import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

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


const toDecimal = (voteBalance: BigNumber, totalSupply: BigNumber): number => {
	const decimals: number = 2;
	const exponent: number = totalSupply.toString().length - voteBalance.toString().length + 4;

	// @ts-ignore
	const div = voteBalance.times(Math.pow(10, exponent)).dividedBy(totalSupply) / Math.pow(10, exponent - decimals);

	return +Number(div).toFixed(2);
};

export const calculateApproval = (voteBalance: BigNumber, totalSupply: BigNumber): number => {
	return toDecimal(voteBalance, totalSupply);
};
