import { Crypto, Shared } from "@arkecosystem/core-contracts";

export interface MilestoneSearchResult {
	found: boolean;
	height: number;
	data: any;
}

export const getMilestonesWhichAffectActiveValidatorCount = (
	configuration: Crypto.IConfiguration,
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

export const calculateForgingInfo = (
	timestamp: number,
	height: number,
	getTimeStampForBlock: (blockheight: number) => number,
	configuration: Crypto.IConfiguration,
	slots,
): Shared.ForgingInfo => {
	const slotInfo = slots.getSlotInfo(getTimeStampForBlock, timestamp, height);

	const [currentForger, nextForger] = findIndex(
		height,
		slotInfo.slotNumber,
		getTimeStampForBlock,
		configuration,
		slots,
	);
	const canForge = slotInfo.forgingStatus;

	return { blockTimestamp: slotInfo.startTime, canForge, currentForger, nextForger };
};

const findIndex = (
	height: number,
	slotNumber: number,
	getTimeStampForBlock: (blockheight: number) => number,
	configuration: Crypto.IConfiguration,
	slots,
): [number, number] => {
	let nextMilestone = configuration.getNextMilestoneWithNewKey(1, "activeValidators");

	let lastSpanSlotNumber = 0;
	let activeValidators = configuration.getMilestone(1).activeValidators;

	const milestones = getMilestonesWhichAffectActiveValidatorCount(configuration);

	for (let index = 0; index < milestones.length - 1; index++) {
		if (height < nextMilestone.height) {
			break;
		}

		const lastSpanEndTime = getTimeStampForBlock(nextMilestone.height - 1);
		lastSpanSlotNumber =
			slots.getSlotInfo(getTimeStampForBlock, lastSpanEndTime, nextMilestone.height - 1).slotNumber + 1;
		activeValidators = nextMilestone.data;

		nextMilestone = configuration.getNextMilestoneWithNewKey(nextMilestone.height, "activeValidators");
	}

	const currentForger = (slotNumber - lastSpanSlotNumber) % activeValidators;
	const nextForger = (currentForger + 1) % activeValidators;

	return [currentForger, nextForger];
};
