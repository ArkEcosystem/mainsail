import { describe } from "@arkecosystem/core-test-framework";
import { Slots } from "./slots";
import { configManager } from "../managers/config";
import { devnet } from "../networks";
import { NetworkConfig } from "../interfaces";

const getTimeStampForBlock = (height: number) => {
	switch (height) {
		case 1:
			return 0;
		default:
			throw new Error(`Test scenarios should not hit this line`);
	}
};

describe<{
	config: NetworkConfig;
}>("Slots", ({ it, assert, beforeAll, afterAll, stub }) => {
	beforeAll((context) => {
		context.config = configManager.all();

		configManager.setConfig(devnet);
	});

	afterAll((context) => configManager.setConfig(context.config));

	it("[fixed block times] getTime - return epoch time as number", () => {
		const result = Slots.getTime(1490101210000);

		assert.number(result);
		assert.equal(result, 10);
	});

	it("[fixed block times] getSlotNumber - return slot number", () => {
		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 1, 1), 0);
		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 4, 1), 0);
		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 7, 1), 0);

		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 8, 2), 1);
		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 9, 2), 1);
		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 10, 2), 1);
		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 11, 2), 1);
		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 15, 2), 1);

		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 16, 3), 2);
		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 20, 3), 2);

		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 24, 4), 3);

		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 8000, 1001), 1000);

		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 15000, 1876), 1875);

		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 169000, 21126), 21125);
		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 169001, 21126), 21125);
		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 169005, 21126), 21125);
		assert.equal(Slots.getSlotNumber(getTimeStampForBlock, 169007, 21126), 21125);
	});

	it("[fixed block times] getSlotTime - returns slot time", () => {
		assert.equal(Slots.getSlotTime(getTimeStampForBlock, 1, 2), 8);
		assert.equal(Slots.getSlotTime(getTimeStampForBlock, 8, 9), 64);
		assert.equal(Slots.getSlotTime(getTimeStampForBlock, 50, 51), 400);
		assert.equal(Slots.getSlotTime(getTimeStampForBlock, 8888, 8889), 71104);
		assert.equal(Slots.getSlotTime(getTimeStampForBlock, 19614, 19615), 156912);
		assert.equal(Slots.getSlotTime(getTimeStampForBlock, 19700, 19701), 157600);
		assert.equal(Slots.getSlotTime(getTimeStampForBlock, 169000, 1), 1352000);
	});

	it("[fixed block times] getSlotInfo - should return positive values when called without timestamp", () => {
		const slotInfo = Slots.getSlotInfo(getTimeStampForBlock, undefined, undefined);

		assert.gt(slotInfo.startTime, 0);
		assert.gt(slotInfo.endTime, 0);
		assert.gt(slotInfo.blockTime, 0);
		assert.gt(slotInfo.slotNumber, 0);
		assert.boolean(slotInfo.forgingStatus);
	});

	it("[fixed block times] getSlotInfo - should return correct values", () => {
		const expectedResults = [
			{
				height: 1,
				timestamp: 0,
				startTime: 0,
				endTime: 7,
				blockTime: 8,
				slotNumber: 0,
				forgingStatus: true,
			},
			{
				height: 2,
				timestamp: 8,
				startTime: 8,
				endTime: 15,
				blockTime: 8,
				slotNumber: 1,
				forgingStatus: true,
			},
			{
				height: 3,
				timestamp: 16,
				startTime: 16,
				endTime: 23,
				blockTime: 8,
				slotNumber: 2,
				forgingStatus: true,
			},
			{
				height: 4,
				timestamp: 24,
				startTime: 24,
				endTime: 31,
				blockTime: 8,
				slotNumber: 3,
				forgingStatus: true,
			},

			{
				height: 4,
				timestamp: 25,
				startTime: 24,
				endTime: 31,
				blockTime: 8,
				slotNumber: 3,
				forgingStatus: true,
			},
			{
				height: 4,
				timestamp: 26,
				startTime: 24,
				endTime: 31,
				blockTime: 8,
				slotNumber: 3,
				forgingStatus: true,
			},
			{
				height: 4,
				timestamp: 27,
				startTime: 24,
				endTime: 31,
				blockTime: 8,
				slotNumber: 3,
				forgingStatus: true,
			},
		];

		const endSlotTimeResults = [
			{
				height: 1,
				timestamp: 7,
				startTime: 0,
				endTime: 7,
				blockTime: 8,
				slotNumber: 0,
				forgingStatus: false,
			},
			{
				height: 2,
				timestamp: 15,
				startTime: 8,
				endTime: 15,
				blockTime: 8,
				slotNumber: 1,
				forgingStatus: false,
			},
			{
				height: 3,
				timestamp: 23,
				startTime: 16,
				endTime: 23,
				blockTime: 8,
				slotNumber: 2,
				forgingStatus: false,
			},
			{
				height: 4,
				timestamp: 31,
				startTime: 24,
				endTime: 31,
				blockTime: 8,
				slotNumber: 3,
				forgingStatus: false,
			},

			{
				height: 4,
				timestamp: 30,
				startTime: 24,
				endTime: 31,
				blockTime: 8,
				slotNumber: 3,
				forgingStatus: false,
			},
			{
				height: 4,
				timestamp: 29,
				startTime: 24,
				endTime: 31,
				blockTime: 8,
				slotNumber: 3,
				forgingStatus: false,
			},
			{
				height: 4,
				timestamp: 28,
				startTime: 24,
				endTime: 31,
				blockTime: 8,
				slotNumber: 3,
				forgingStatus: false,
			},
		];

		const missedBlocks = [
			{
				height: 2,
				timestamp: 24,
				startTime: 24,
				endTime: 31,
				blockTime: 8,
				slotNumber: 3,
				forgingStatus: true,
			},
			{
				height: 2,
				timestamp: 31,
				startTime: 24,
				endTime: 31,
				blockTime: 8,
				slotNumber: 3,
				forgingStatus: false,
			},
		];

		expectedResults
			.concat(endSlotTimeResults)
			.concat(missedBlocks)
			.forEach((item) => {
				assert.equal(Slots.getSlotInfo(getTimeStampForBlock, item.timestamp, item.height), {
					startTime: item.startTime,
					endTime: item.endTime,
					blockTime: item.blockTime,
					slotNumber: item.slotNumber,
					forgingStatus: item.forgingStatus,
				});
			});
	});

	it("[fixed block times] getNextSlot - returns next slot", () => {
		assert.number(Slots.getNextSlot(getTimeStampForBlock));
	});

	it("[fixed block times] getNextSlot - returns next when height is defined in configManager", () => {
		configManager.setHeight(12);
		assert.number(Slots.getNextSlot(getTimeStampForBlock));
	});

	it("[fixed block times] isForgingAllowed - returns boolean", () => {
		assert.boolean(Slots.isForgingAllowed(getTimeStampForBlock));
	});

	it("[fixed block times] isForgingAllowed - returns true when over half the time in the block remains", () => {
		assert.true(Slots.isForgingAllowed(getTimeStampForBlock, 0));
		assert.true(Slots.isForgingAllowed(getTimeStampForBlock, 1));
		assert.true(Slots.isForgingAllowed(getTimeStampForBlock, 3));
		assert.true(Slots.isForgingAllowed(getTimeStampForBlock, 8));
		assert.true(Slots.isForgingAllowed(getTimeStampForBlock, 16));
	});

	it("[fixed block times] isForgingAllowed - returns false when under half the time in the block remains", () => {
		assert.false(Slots.isForgingAllowed(getTimeStampForBlock, 4));
		assert.false(Slots.isForgingAllowed(getTimeStampForBlock, 5));
		assert.false(Slots.isForgingAllowed(getTimeStampForBlock, 6));
		assert.false(Slots.isForgingAllowed(getTimeStampForBlock, 7));
		assert.false(Slots.isForgingAllowed(getTimeStampForBlock, 15));
	});

	it("[fixed block times] getTimeInMsUntilNextSlot - should be ok", () => {
		stub(Slots, "getTime").returnValue(200);
		const nextSlotTime = Slots.getSlotTime(getTimeStampForBlock, Slots.getNextSlot(getTimeStampForBlock));
		const now = Slots.getTime();
		assert.equal(Slots.getTimeInMsUntilNextSlot(getTimeStampForBlock), (nextSlotTime - now) * 1000);
	});

	it("[dynamic block times] getSlotNumber - should return the correct slot number given a timestamp within a known height", () => {
		const milestones = [
			{ height: 1, blocktime: 9 },
			{ height: 3, blocktime: 8 },
			{ height: 4, blocktime: 5 },
		];
		const config = { ...devnet, milestones };
		configManager.setConfig(config);

		const getTimeStampForBlockLocal = (height: number) => {
			switch (height) {
				case 1:
					return 0;
				case 2:
					return 9;
				case 3:
					return 18;
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		};

		assert.equal(Slots.getSlotNumber(getTimeStampForBlockLocal, 1, 1), 0);
		assert.equal(Slots.getSlotNumber(getTimeStampForBlockLocal, 8, 1), 0);

		assert.equal(Slots.getSlotNumber(getTimeStampForBlockLocal, 9, 2), 1);
		assert.equal(Slots.getSlotNumber(getTimeStampForBlockLocal, 17, 2), 1);

		assert.equal(Slots.getSlotNumber(getTimeStampForBlockLocal, 18, 3), 2);
		assert.equal(Slots.getSlotNumber(getTimeStampForBlockLocal, 25, 3), 2);

		assert.equal(Slots.getSlotNumber(getTimeStampForBlockLocal, 26, 4), 3);
		assert.equal(Slots.getSlotNumber(getTimeStampForBlockLocal, 30, 4), 3);

		assert.equal(Slots.getSlotNumber(getTimeStampForBlockLocal, 31, 5), 4);
		assert.equal(Slots.getSlotNumber(getTimeStampForBlockLocal, 35, 5), 4);

		assert.equal(Slots.getSlotNumber(getTimeStampForBlockLocal, 36, 6), 5);
	});

	it("[dynamic block times] getSlotTime", () => {
		const milestones = [
			{ height: 1, blocktime: 8 },
			{ height: 3, blocktime: 9 },
			{ height: 6, blocktime: 10 },
			{ height: 8, blocktime: 8 },
		];
		const config = { ...devnet, milestones };
		configManager.setConfig(config);

		const getTimeStampForBlockLocal = (height: number) => {
			switch (height) {
				case 1:
					return 0;
				case 2:
					return 8;
				case 3:
					return 16;
				case 5:
					return 34;
				case 6:
					return 43;
				case 7:
					return 53;
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		};

		assert.equal(Slots.getSlotTime(getTimeStampForBlockLocal, 1, 2), 8);
		assert.equal(Slots.getSlotTime(getTimeStampForBlockLocal, 2, 3), 16);
		assert.equal(Slots.getSlotTime(getTimeStampForBlockLocal, 3, 4), 25);
		assert.equal(Slots.getSlotTime(getTimeStampForBlockLocal, 4, 5), 34);
		assert.equal(Slots.getSlotTime(getTimeStampForBlockLocal, 5, 6), 43);
		assert.equal(Slots.getSlotTime(getTimeStampForBlockLocal, 6, 7), 53);
		assert.equal(Slots.getSlotTime(getTimeStampForBlockLocal, 7, 8), 63);
		assert.equal(Slots.getSlotTime(getTimeStampForBlockLocal, 8, 9), 71);
		assert.equal(Slots.getSlotTime(getTimeStampForBlockLocal, 14, 15), 119);
	});

	it("[dynamic block times] getSlotInfo - should return correct values", () => {
		const milestones = [
			{ height: 1, blocktime: 8 },
			{ height: 2, blocktime: 4 },
			{ height: 4, blocktime: 3 },
			{ height: 6, blocktime: 4 },
		];
		const config = { ...devnet, milestones };
		configManager.setConfig(config);

		const getTimeStampForBlockLocal = (height: number) => {
			switch (height) {
				case 1:
					return 0;
				case 2:
					return 8;
				case 3:
					return 12;
				case 4:
					return 16;
				case 5:
					return 19;
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		};

		const expectedResults = [
			{
				height: 1,
				timestamp: 0,
				startTime: 0,
				endTime: 7,
				blockTime: 8,
				slotNumber: 0,
				forgingStatus: true,
			},
			{
				height: 2,
				timestamp: 8,
				startTime: 8,
				endTime: 11,
				blockTime: 4,
				slotNumber: 1,
				forgingStatus: true,
			},
			{
				height: 3,
				timestamp: 12,
				startTime: 12,
				endTime: 15,
				blockTime: 4,
				slotNumber: 2,
				forgingStatus: true,
			},
			{
				height: 4,
				timestamp: 16,
				startTime: 16,
				endTime: 18,
				blockTime: 3,
				slotNumber: 3,
				forgingStatus: true,
			},
			{
				height: 5,
				timestamp: 19,
				startTime: 19,
				endTime: 21,
				blockTime: 3,
				slotNumber: 4,
				forgingStatus: true,
			},
			{
				height: 6,
				timestamp: 22,
				startTime: 22,
				endTime: 25,
				blockTime: 4,
				slotNumber: 5,
				forgingStatus: true,
			},
			{
				height: 7,
				timestamp: 26,
				startTime: 26,
				endTime: 29,
				blockTime: 4,
				slotNumber: 6,
				forgingStatus: true,
			},
		];

		const endSlotTimeResults = [
			{
				height: 1,
				timestamp: 7,
				startTime: 0,
				endTime: 7,
				blockTime: 8,
				slotNumber: 0,
				forgingStatus: false,
			},
			{
				height: 2,
				timestamp: 11,
				startTime: 8,
				endTime: 11,
				blockTime: 4,
				slotNumber: 1,
				forgingStatus: false,
			},
			{
				height: 3,
				timestamp: 15,
				startTime: 12,
				endTime: 15,
				blockTime: 4,
				slotNumber: 2,
				forgingStatus: false,
			},
			{
				height: 4,
				timestamp: 18,
				startTime: 16,
				endTime: 18,
				blockTime: 3,
				slotNumber: 3,
				forgingStatus: false,
			},
			{
				height: 5,
				timestamp: 21,
				startTime: 19,
				endTime: 21,
				blockTime: 3,
				slotNumber: 4,
				forgingStatus: false,
			},
			{
				height: 6,
				timestamp: 25,
				startTime: 22,
				endTime: 25,
				blockTime: 4,
				slotNumber: 5,
				forgingStatus: false,
			},
			{
				height: 7,
				timestamp: 29,
				startTime: 26,
				endTime: 29,
				blockTime: 4,
				slotNumber: 6,
				forgingStatus: false,
			},
		];

		const missedBlocks = [
			{
				height: 3,
				timestamp: 16,
				startTime: 16,
				endTime: 19,
				blockTime: 4,
				slotNumber: 3,
				forgingStatus: true,
			},
			{
				height: 3,
				timestamp: 20,
				startTime: 20,
				endTime: 23,
				blockTime: 4,
				slotNumber: 4,
				forgingStatus: true,
			},
			{
				height: 3,
				timestamp: 24,
				startTime: 24,
				endTime: 27,
				blockTime: 4,
				slotNumber: 5,
				forgingStatus: true,
			},
			{
				height: 3,
				timestamp: 27,
				startTime: 24,
				endTime: 27,
				blockTime: 4,
				slotNumber: 5,
				forgingStatus: false,
			},
			{
				height: 4,
				timestamp: 19,
				startTime: 19,
				endTime: 21,
				blockTime: 3,
				slotNumber: 4,
				forgingStatus: true,
			},
			{
				height: 4,
				timestamp: 22,
				startTime: 22,
				endTime: 24,
				blockTime: 3,
				slotNumber: 5,
				forgingStatus: true,
			},
			{
				height: 4,
				timestamp: 24,
				startTime: 22,
				endTime: 24,
				blockTime: 3,
				slotNumber: 5,
				forgingStatus: false,
			},
			{
				height: 7,
				timestamp: 30,
				startTime: 30,
				endTime: 33,
				blockTime: 4,
				slotNumber: 7,
				forgingStatus: true,
			},
			{
				height: 7,
				timestamp: 34,
				startTime: 34,
				endTime: 37,
				blockTime: 4,
				slotNumber: 8,
				forgingStatus: true,
			},
			{
				height: 7,
				timestamp: 37,
				startTime: 34,
				endTime: 37,
				blockTime: 4,
				slotNumber: 8,
				forgingStatus: false,
			},
		];

		expectedResults
			.concat(endSlotTimeResults)
			.concat(missedBlocks)
			.forEach((item) => {
				assert.equal(Slots.getSlotInfo(getTimeStampForBlockLocal, item.timestamp, item.height), {
					startTime: item.startTime,
					endTime: item.endTime,
					blockTime: item.blockTime,
					slotNumber: item.slotNumber,
					forgingStatus: item.forgingStatus,
				});
			});
	});

	it("[dynamic block times] isForgingAllowed - returns true when over half the time in the block remains", () => {
		const getTimeStampForBlockLocal = (height: number) => {
			switch (height) {
				case 1:
					return 0;
				case 2:
					return 8;
				case 3:
					return 16;
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		};

		const milestones = [
			{ height: 1, blocktime: 8 },
			{ height: 3, blocktime: 7 },
			{ height: 4, blocktime: 5 },
		];
		const config = { ...devnet, milestones };
		configManager.setConfig(config);

		assert.true(Slots.isForgingAllowed(getTimeStampForBlockLocal, 0, 1));
		assert.true(Slots.isForgingAllowed(getTimeStampForBlockLocal, 1, 1));
		assert.true(Slots.isForgingAllowed(getTimeStampForBlockLocal, 3, 1));
		assert.true(Slots.isForgingAllowed(getTimeStampForBlockLocal, 8, 2));
		assert.true(Slots.isForgingAllowed(getTimeStampForBlockLocal, 11, 2));
		assert.true(Slots.isForgingAllowed(getTimeStampForBlockLocal, 16, 3));
		assert.true(Slots.isForgingAllowed(getTimeStampForBlockLocal, 18, 3));
		assert.true(Slots.isForgingAllowed(getTimeStampForBlockLocal, 23, 4));
		assert.true(Slots.isForgingAllowed(getTimeStampForBlockLocal, 28, 5));
		assert.true(Slots.isForgingAllowed(getTimeStampForBlockLocal, 29, 5));
	});

	it("[dynamic block times] isForgingAllowed - returns false when under half the time in the block remains", () => {
		const getTimeStampForBlockLocal = (height: number) => {
			switch (height) {
				case 1:
					return 0;
				case 2:
					return 8;
				case 3:
					return 16;
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		};

		const milestones = [
			{ height: 1, blocktime: 8 },
			{ height: 3, blocktime: 7 },
			{ height: 4, blocktime: 5 },
		];
		const config = { ...devnet, milestones };
		configManager.setConfig(config);

		assert.false(Slots.isForgingAllowed(getTimeStampForBlockLocal, 4, 1));
		assert.false(Slots.isForgingAllowed(getTimeStampForBlockLocal, 5, 1));
		assert.false(Slots.isForgingAllowed(getTimeStampForBlockLocal, 6, 1));
		assert.false(Slots.isForgingAllowed(getTimeStampForBlockLocal, 7, 1));
		assert.false(Slots.isForgingAllowed(getTimeStampForBlockLocal, 12, 2));
		assert.false(Slots.isForgingAllowed(getTimeStampForBlockLocal, 15, 2));
		assert.false(Slots.isForgingAllowed(getTimeStampForBlockLocal, 19, 3));
		assert.false(Slots.isForgingAllowed(getTimeStampForBlockLocal, 22, 3));
		assert.false(Slots.isForgingAllowed(getTimeStampForBlockLocal, 25, 4));
		assert.false(Slots.isForgingAllowed(getTimeStampForBlockLocal, 26, 4));
		assert.false(Slots.isForgingAllowed(getTimeStampForBlockLocal, 27, 4));
		assert.false(Slots.isForgingAllowed(getTimeStampForBlockLocal, 30, 5));
		assert.false(Slots.isForgingAllowed(getTimeStampForBlockLocal, 32, 5));
	});

	it("[missed slots] - calculateSlotTime - should calculate the slot time correctly when slots have been missed", () => {
		const milestones = [
			{ height: 1, blocktime: 4 },
			{ height: 4, blocktime: 3 },
			{ height: 7, blocktime: 4 },
		];
		const config = { ...devnet, milestones };
		configManager.setConfig(config);

		const getTimeStampForBlockLocal = (height: number) => {
			switch (height) {
				case 1:
					return 0;
				case 3:
					return 8;
				case 4:
					return 12;
				case 6:
					return 18;
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		};

		const expectedResults = [
			{ height: 1, slot: 0, slotTime: 0 },
			{ height: 2, slot: 1, slotTime: 4 },
			{ height: 3, slot: 2, slotTime: 8 },
			{ height: 4, slot: 3, slotTime: 12 },
			{ height: 5, slot: 4, slotTime: 15 },
			{ height: 6, slot: 5, slotTime: 18 },
			{ height: 7, slot: 6, slotTime: 21 },
			{ height: 8, slot: 7, slotTime: 25 },
			{ height: 9, slot: 8, slotTime: 29 },
			{ height: 10, slot: 9, slotTime: 33 },
			{ height: 11, slot: 10, slotTime: 37 },
		];

		const missedBlocks = [
			{ height: 2, slot: 2, slotTime: 8 },
			{ height: 2, slot: 3, slotTime: 12 },
			{ height: 2, slot: 9, slotTime: 36 },
			{ height: 4, slot: 4, slotTime: 15 },
			{ height: 4, slot: 14, slotTime: 45 },
			{ height: 7, slot: 7, slotTime: 25 },
			{ height: 7, slot: 8, slotTime: 29 },
			{ height: 11, slot: 11, slotTime: 41 },
			{ height: 11, slot: 21, slotTime: 81 },
		];

		expectedResults.concat(missedBlocks).forEach((item) => {
			assert.equal(Slots.getSlotTime(getTimeStampForBlockLocal, item.slot, item.height), item.slotTime);
		});
	});

	it("[missed slots] - getSlotInfo - should return positive values when called without timestamp", () => {
		const milestones = [
			{ height: 1, blocktime: 4, epoch: "2017-03-21T13:00:00.000Z" },
			{ height: 4, blocktime: 3 },
			{ height: 7, blocktime: 4 },
		];
		const config = { ...devnet, milestones };
		configManager.setConfig(config);

		const getTimeStampForBlockLocal = (height: number) => {
			switch (height) {
				case 1:
					return 0;
				case 3:
					return 16;
				case 4:
					return 20;
				case 6:
					return 29;
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		};

		const slotInfo = Slots.getSlotInfo(getTimeStampForBlockLocal, undefined, undefined);

		assert.gt(slotInfo.startTime, 0);
		assert.gt(slotInfo.endTime, 0);
		assert.gte(slotInfo.blockTime, 3);
		assert.lte(slotInfo.blockTime, 4);
		assert.gt(slotInfo.slotNumber, 0);
		assert.boolean(slotInfo.forgingStatus);
	});

	it("[missed slots] - getSlotInfo - should calculate the next slot correctly when slots have been missed", () => {
		const milestones = [
			{ height: 1, blocktime: 4, epoch: "2017-03-21T13:00:00.000Z" },
			{ height: 4, blocktime: 3 },
			{ height: 7, blocktime: 4 },
		];
		const config = { ...devnet, milestones };
		configManager.setConfig(config);

		const getTimeStampForBlockLocal = (height: number) => {
			switch (height) {
				case 1:
					return 0;
				case 3:
					return 16;
				case 4:
					return 20;
				case 6:
					return 29;
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		};

		const expectedResults = [
			{
				height: 1,
				timestamp: 0,
				startTime: 0,
				endTime: 3,
				blockTime: 4,
				slotNumber: 0,
				forgingStatus: true,
			},
			{
				height: 1,
				timestamp: 1,
				startTime: 0,
				endTime: 3,
				blockTime: 4,
				slotNumber: 0,
				forgingStatus: true,
			},
			{
				height: 2,
				timestamp: 4,
				startTime: 4,
				endTime: 7,
				blockTime: 4,
				slotNumber: 1,
				forgingStatus: true,
			},
			{
				height: 3,
				timestamp: 8,
				startTime: 8,
				endTime: 11,
				blockTime: 4,
				slotNumber: 2,
				forgingStatus: true,
			},
			{
				height: 4,
				timestamp: 20,
				startTime: 20,
				endTime: 22,
				blockTime: 3,
				slotNumber: 5,
				forgingStatus: true,
			},
			{
				height: 5,
				timestamp: 23,
				startTime: 23,
				endTime: 25,
				blockTime: 3,
				slotNumber: 6,
				forgingStatus: true,
			},
			{
				height: 6,
				timestamp: 29,
				startTime: 29,
				endTime: 31,
				blockTime: 3,
				slotNumber: 8,
				forgingStatus: true,
			},
			{
				height: 7,
				timestamp: 32,
				startTime: 32,
				endTime: 35,
				blockTime: 4,
				slotNumber: 9,
				forgingStatus: true,
			},
			{
				height: 8,
				timestamp: 40,
				startTime: 40,
				endTime: 43,
				blockTime: 4,
				slotNumber: 11,
				forgingStatus: true,
			},
			{
				height: 8,
				timestamp: 41,
				startTime: 40,
				endTime: 43,
				blockTime: 4,
				slotNumber: 11,
				forgingStatus: true,
			},
		];

		const offTimeResults = [
			{
				height: 1,
				timestamp: 2,
				startTime: 0,
				endTime: 3,
				blockTime: 4,
				slotNumber: 0,
				forgingStatus: false,
			},
			{
				height: 1,
				timestamp: 3,
				startTime: 0,
				endTime: 3,
				blockTime: 4,
				slotNumber: 0,
				forgingStatus: false,
			},
			{
				height: 2,
				timestamp: 7,
				startTime: 4,
				endTime: 7,
				blockTime: 4,
				slotNumber: 1,
				forgingStatus: false,
			},
			{
				height: 3,
				timestamp: 11,
				startTime: 8,
				endTime: 11,
				blockTime: 4,
				slotNumber: 2,
				forgingStatus: false,
			},
			{
				height: 4,
				timestamp: 22,
				startTime: 20,
				endTime: 22,
				blockTime: 3,
				slotNumber: 5,
				forgingStatus: false,
			},
			{
				height: 5,
				timestamp: 25,
				startTime: 23,
				endTime: 25,
				blockTime: 3,
				slotNumber: 6,
				forgingStatus: false,
			},
			{
				height: 6,
				timestamp: 31,
				startTime: 29,
				endTime: 31,
				blockTime: 3,
				slotNumber: 8,
				forgingStatus: false,
			},
			{
				height: 7,
				timestamp: 35,
				startTime: 32,
				endTime: 35,
				blockTime: 4,
				slotNumber: 9,
				forgingStatus: false,
			},
			{
				height: 8,
				timestamp: 42,
				startTime: 40,
				endTime: 43,
				blockTime: 4,
				slotNumber: 11,
				forgingStatus: false,
			},
			{
				height: 8,
				timestamp: 43,
				startTime: 40,
				endTime: 43,
				blockTime: 4,
				slotNumber: 11,
				forgingStatus: false,
			},
		];

		const missedSlots = [
			{
				height: 3,
				timestamp: 12,
				startTime: 12,
				endTime: 15,
				blockTime: 4,
				slotNumber: 3,
				forgingStatus: true,
			},
			{
				height: 3,
				timestamp: 16,
				startTime: 16,
				endTime: 19,
				blockTime: 4,
				slotNumber: 4,
				forgingStatus: true,
			},
			{
				height: 5,
				timestamp: 26,
				startTime: 26,
				endTime: 28,
				blockTime: 3,
				slotNumber: 7,
				forgingStatus: true,
			},
			{
				height: 7,
				timestamp: 36,
				startTime: 36,
				endTime: 39,
				blockTime: 4,
				slotNumber: 10,
				forgingStatus: true,
			},
		];

		const missedOffTimeResults = [
			{
				height: 3,
				timestamp: 15,
				startTime: 12,
				endTime: 15,
				blockTime: 4,
				slotNumber: 3,
				forgingStatus: false,
			},
			{
				height: 3,
				timestamp: 19,
				startTime: 16,
				endTime: 19,
				blockTime: 4,
				slotNumber: 4,
				forgingStatus: false,
			},
			{
				height: 5,
				timestamp: 28,
				startTime: 26,
				endTime: 28,
				blockTime: 3,
				slotNumber: 7,
				forgingStatus: false,
			},
			{
				height: 7,
				timestamp: 39,
				startTime: 36,
				endTime: 39,
				blockTime: 4,
				slotNumber: 10,
				forgingStatus: false,
			},
		];

		expectedResults
			.concat(offTimeResults)
			.concat(missedSlots)
			.concat(missedOffTimeResults)
			.forEach((item) => {
				assert.equal(Slots.getSlotInfo(getTimeStampForBlockLocal, item.timestamp, item.height), {
					startTime: item.startTime,
					endTime: item.endTime,
					blockTime: item.blockTime,
					slotNumber: item.slotNumber,
					forgingStatus: item.forgingStatus,
				});
			});
	});
});
