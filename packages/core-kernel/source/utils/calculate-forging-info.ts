import { Crypto, Shared } from "@arkecosystem/core-contracts";

export interface MilestoneSearchResult {
	found: boolean;
	height: number;
	data: any;
}

export const getMilestonesWhichAffectActiveDelegateCount = (
	configuration: Crypto.IConfiguration,
): Array<MilestoneSearchResult> => {
	const milestones: Array<MilestoneSearchResult> = [
		{
			data: configuration.getMilestone(1).activeDelegates,
			found: true,
			height: 1,
		},
	];

	let nextMilestone = configuration.getNextMilestoneWithNewKey(1, "activeDelegates");

	while (nextMilestone.found) {
		milestones.push(nextMilestone);
		nextMilestone = configuration.getNextMilestoneWithNewKey(nextMilestone.height, "activeDelegates");
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
	let nextMilestone = configuration.getNextMilestoneWithNewKey(1, "activeDelegates");

	let lastSpanSlotNumber = 0;
	let activeDelegates = configuration.getMilestone(1).activeDelegates;

	const milestones = getMilestonesWhichAffectActiveDelegateCount(configuration);

	for (let index = 0; index < milestones.length - 1; index++) {
		if (height < nextMilestone.height) {
			break;
		}

		const lastSpanEndTime = getTimeStampForBlock(nextMilestone.height - 1);
		lastSpanSlotNumber =
			slots.getSlotInfo(getTimeStampForBlock, lastSpanEndTime, nextMilestone.height - 1).slotNumber + 1;
		activeDelegates = nextMilestone.data;

		nextMilestone = configuration.getNextMilestoneWithNewKey(nextMilestone.height, "activeDelegates");
	}

	const currentForger = (slotNumber - lastSpanSlotNumber) % activeDelegates;
	const nextForger = (currentForger + 1) % activeDelegates;

	return [currentForger, nextForger];
};
