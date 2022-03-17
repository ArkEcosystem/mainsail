import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

const findIndex = async (
	height: number,
	slotNumber: number,
	app: Contracts.Kernel.Application,
): Promise<[number, number]> => {
	const configuration: Contracts.Crypto.IConfiguration = app.get(Identifiers.Cryptography.Configuration);
	const blockTimeLookup: any = app.get(Identifiers.Cryptography.Time.BlockTimeLookup); // TODO: Add contract
	const slots: Contracts.Crypto.Slots = app.get(Identifiers.Cryptography.Time.Slots);

	let nextMilestone = configuration.getNextMilestoneWithNewKey(1, "activeValidators");

	let lastSpanSlotNumber = 0;
	let activeValidators = configuration.getMilestone(1).activeValidators;

	const milestones = getMilestonesWhichAffectActiveValidatorCount(configuration);

	for (let index = 0; index < milestones.length - 1; index++) {
		if (height < nextMilestone.height) {
			break;
		}

		const lastSpanEndTime = blockTimeLookup.getBlockTimeLookup(nextMilestone.height - 1);
		lastSpanSlotNumber = (await slots.getSlotInfo(lastSpanEndTime, nextMilestone.height - 1)).slotNumber + 1;
		activeValidators = nextMilestone.data;

		nextMilestone = configuration.getNextMilestoneWithNewKey(nextMilestone.height, "activeValidators");
	}

	const currentForger = (slotNumber - lastSpanSlotNumber) % activeValidators;
	const nextForger = (currentForger + 1) % activeValidators;

	return [currentForger, nextForger];
};

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

export const calculateForgingInfo = async (
	timestamp: number,
	height: number,
	app: Contracts.Kernel.Application,
): Promise<Contracts.Shared.ForgingInfo> => {
	const slotInfo = await app
		.get<Contracts.Crypto.Slots>(Identifiers.Cryptography.Time.Slots)
		.getSlotInfo(timestamp, height);

	const [currentForger, nextForger] = await findIndex(height, slotInfo.slotNumber, app);
	const canForge = slotInfo.forgingStatus;

	return { blockTimestamp: slotInfo.startTime, canForge, currentForger, nextForger };
};
