import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { Application } from "@arkecosystem/core-kernel";

import { describe } from "../../core-test-framework/source";
import { BlockTimeCalculator } from "./block-time-calculator";
import { Slots } from "./slots";

const setup = (context) => {
	const app = new Application(new Container());

	app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
	app.bind(Identifiers.Cryptography.Time.BlockTimeCalculator).to(BlockTimeCalculator).inSingletonScope();

	app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(
		require("../../core/bin/config/testnet/crypto.json"),
	);

	context.configuration = app.get(Identifiers.Cryptography.Configuration);
	context.slots = app.resolve(Slots);
};

describe<{
	configuration: Configuration;
	slots: Slots;
}>("Constant Slot Time", ({ assert, beforeEach, it }) => {
	const getTimeStampForBlock = (height: number) => {
		switch (height) {
			case 1:
				return 0;
			default:
				throw new Error(`Test scenarios should not hit this line`);
		}
	};

	beforeEach(setup);

	it("return epoch time as number", (context) => {
		assert.number(context.slots.getTime());
		assert.is(context.slots.getTime(1_490_101_210_000), 1_490_101_210_000);
	});

	it("return slot number", (context) => {
		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 1, 1), 0);
		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 4, 1), 0);
		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 7, 1), 0);

		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 8, 2), 1);
		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 9, 2), 1);
		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 10, 2), 1);
		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 11, 2), 1);
		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 15, 2), 1);

		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 16, 3), 2);
		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 20, 3), 2);

		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 24, 4), 3);

		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 8000, 1001), 1000);

		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 15_000, 1876), 1875);

		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 169_000, 21_126), 21_125);
		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 169_001, 21_126), 21_125);
		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 169_005, 21_126), 21_125);
		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 169_007, 21_126), 21_125);
	});

	it("returns slot time", (context) => {
		assert.is(context.slots.getSlotTime(getTimeStampForBlock, 1, 2), 8);
		assert.is(context.slots.getSlotTime(getTimeStampForBlock, 8, 9), 64);
		assert.is(context.slots.getSlotTime(getTimeStampForBlock, 50, 51), 400);
		assert.is(context.slots.getSlotTime(getTimeStampForBlock, 8888, 8889), 71_104);
		assert.is(context.slots.getSlotTime(getTimeStampForBlock, 19_614, 19_615), 156_912);
		assert.is(context.slots.getSlotTime(getTimeStampForBlock, 19_700, 19_701), 157_600);
		assert.is(context.slots.getSlotTime(getTimeStampForBlock, 169_000, 1), 1_352_000);
	});

	it("getSlotInfo / should return positive values when called without timestamp", (context) => {
		const slotInfo = context.slots.getSlotInfo(getTimeStampForBlock);

		assert.positive(slotInfo.startTime);
		assert.positive(slotInfo.endTime);
		assert.positive(slotInfo.blockTime);
		assert.positive(slotInfo.slotNumber);
		assert.boolean(slotInfo.forgingStatus);
	});

	it("getSlotInfo / should return correct values", (context) => {
		const expectedResults = [
			{
				blockTime: 8,
				endTime: 7,
				forgingStatus: true,
				height: 1,
				slotNumber: 0,
				startTime: 0,
				timestamp: 0,
			},
			{
				blockTime: 8,
				endTime: 15,
				forgingStatus: true,
				height: 2,
				slotNumber: 1,
				startTime: 8,
				timestamp: 8,
			},
			{
				blockTime: 8,
				endTime: 23,
				forgingStatus: true,
				height: 3,
				slotNumber: 2,
				startTime: 16,
				timestamp: 16,
			},
			{
				blockTime: 8,
				endTime: 31,
				forgingStatus: true,
				height: 4,
				slotNumber: 3,
				startTime: 24,
				timestamp: 24,
			},

			{
				blockTime: 8,
				endTime: 31,
				forgingStatus: true,
				height: 4,
				slotNumber: 3,
				startTime: 24,
				timestamp: 25,
			},
			{
				blockTime: 8,
				endTime: 31,
				forgingStatus: true,
				height: 4,
				slotNumber: 3,
				startTime: 24,
				timestamp: 26,
			},
			{
				blockTime: 8,
				endTime: 31,
				forgingStatus: true,
				height: 4,
				slotNumber: 3,
				startTime: 24,
				timestamp: 27,
			},
		];

		const endSlotTimeResults = [
			{
				blockTime: 8,
				endTime: 7,
				forgingStatus: false,
				height: 1,
				slotNumber: 0,
				startTime: 0,
				timestamp: 7,
			},
			{
				blockTime: 8,
				endTime: 15,
				forgingStatus: false,
				height: 2,
				slotNumber: 1,
				startTime: 8,
				timestamp: 15,
			},
			{
				blockTime: 8,
				endTime: 23,
				forgingStatus: false,
				height: 3,
				slotNumber: 2,
				startTime: 16,
				timestamp: 23,
			},
			{
				blockTime: 8,
				endTime: 31,
				forgingStatus: false,
				height: 4,
				slotNumber: 3,
				startTime: 24,
				timestamp: 31,
			},

			{
				blockTime: 8,
				endTime: 31,
				forgingStatus: false,
				height: 4,
				slotNumber: 3,
				startTime: 24,
				timestamp: 30,
			},
			{
				blockTime: 8,
				endTime: 31,
				forgingStatus: false,
				height: 4,
				slotNumber: 3,
				startTime: 24,
				timestamp: 29,
			},
			{
				blockTime: 8,
				endTime: 31,
				forgingStatus: false,
				height: 4,
				slotNumber: 3,
				startTime: 24,
				timestamp: 28,
			},
		];

		const missedBlocks = [
			{
				blockTime: 8,
				endTime: 31,
				forgingStatus: true,
				height: 2,
				slotNumber: 3,
				startTime: 24,
				timestamp: 24,
			},
			{
				blockTime: 8,
				endTime: 31,
				forgingStatus: false,
				height: 2,
				slotNumber: 3,
				startTime: 24,
				timestamp: 31,
			},
		];

		for (const item of [...expectedResults, ...endSlotTimeResults, ...missedBlocks]) {
			assert.equal(context.slots.getSlotInfo(getTimeStampForBlock, item.timestamp, item.height), {
				blockTime: item.blockTime,
				endTime: item.endTime,
				forgingStatus: item.forgingStatus,
				slotNumber: item.slotNumber,
				startTime: item.startTime,
			});
		}
	});

	it("returns next slot", (context) => {
		assert.number(context.slots.getNextSlot(getTimeStampForBlock));
	});

	it("returns next slot when height is defined in configManager", (context) => {
		context.configuration.setHeight(12);

		assert.number(context.slots.getNextSlot(getTimeStampForBlock));
	});

	it("isForgingAllowed / returns boolean", (context) => {
		assert.boolean(context.slots.isForgingAllowed(getTimeStampForBlock));
	});

	it("isForgingAllowed / returns true when over half the time in the block remains", (context) => {
		assert.true(context.slots.isForgingAllowed(getTimeStampForBlock, 0));
		assert.true(context.slots.isForgingAllowed(getTimeStampForBlock, 1));
		assert.true(context.slots.isForgingAllowed(getTimeStampForBlock, 3));
		assert.true(context.slots.isForgingAllowed(getTimeStampForBlock, 8));
		assert.true(context.slots.isForgingAllowed(getTimeStampForBlock, 16));
	});

	it("isForgingAllowed / returns false when under half the time in the block remains", (context) => {
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 4));
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 5));
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 6));
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 7));
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 15));
	});

	it("getTimeInMsUntilNextSlot", (context) => {
		const nextSlotTime = context.slots.getSlotTime(
			getTimeStampForBlock,
			context.slots.getNextSlot(getTimeStampForBlock),
		);
		const now = context.slots.getTime();

		assert.is(context.slots.getTimeInMsUntilNextSlot(getTimeStampForBlock), (nextSlotTime - now) * 1000);
	});
});

describe<{
	configuration: Configuration;
	slots: Slots;
}>("Dynamic Slot Time", ({ assert, beforeEach, it }) => {
	beforeEach(setup);

	it("should return the correct slot number given a timestamp within a known height", (context) => {
		context.configuration.set("milestones", [
			{ blocktime: 9, height: 1 },
			{ blocktime: 8, height: 3 },
			{ blocktime: 5, height: 4 },
		]);

		const getTimeStampForBlock = (height: number) => {
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

		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 1, 1), 0);
		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 8, 1), 0);

		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 9, 2), 1);
		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 17, 2), 1);

		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 18, 3), 2);
		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 25, 3), 2);

		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 26, 4), 3);
		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 30, 4), 3);

		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 31, 5), 4);
		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 35, 5), 4);

		assert.is(context.slots.getSlotNumber(getTimeStampForBlock, 36, 6), 5);
	});

	it("getSlotTime", (context) => {
		context.configuration.set("milestones", [
			{ blocktime: 8, height: 1 },
			{ blocktime: 9, height: 3 },
			{ blocktime: 10, height: 6 },
			{ blocktime: 8, height: 8 },
		]);

		const getTimeStampForBlock = (height: number) => {
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

		assert.is(context.slots.getSlotTime(getTimeStampForBlock, 1, 2), 8);
		assert.is(context.slots.getSlotTime(getTimeStampForBlock, 2, 3), 16);
		assert.is(context.slots.getSlotTime(getTimeStampForBlock, 3, 4), 25);
		assert.is(context.slots.getSlotTime(getTimeStampForBlock, 4, 5), 34);
		assert.is(context.slots.getSlotTime(getTimeStampForBlock, 5, 6), 43);
		assert.is(context.slots.getSlotTime(getTimeStampForBlock, 6, 7), 53);
		assert.is(context.slots.getSlotTime(getTimeStampForBlock, 7, 8), 63);
		assert.is(context.slots.getSlotTime(getTimeStampForBlock, 8, 9), 71);
		assert.is(context.slots.getSlotTime(getTimeStampForBlock, 14, 15), 119);
	});

	it("getSlotInfo / should return correct values", (context) => {
		context.configuration.set("milestones", [
			{ blocktime: 8, height: 1 },
			{ blocktime: 4, height: 2 },
			{ blocktime: 3, height: 4 },
			{ blocktime: 4, height: 6 },
		]);

		const getTimeStampForBlock = (height: number) => {
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
				blockTime: 8,
				endTime: 7,
				forgingStatus: true,
				height: 1,
				slotNumber: 0,
				startTime: 0,
				timestamp: 0,
			},
			{
				blockTime: 4,
				endTime: 11,
				forgingStatus: true,
				height: 2,
				slotNumber: 1,
				startTime: 8,
				timestamp: 8,
			},
			{
				blockTime: 4,
				endTime: 15,
				forgingStatus: true,
				height: 3,
				slotNumber: 2,
				startTime: 12,
				timestamp: 12,
			},
			{
				blockTime: 3,
				endTime: 18,
				forgingStatus: true,
				height: 4,
				slotNumber: 3,
				startTime: 16,
				timestamp: 16,
			},
			{
				blockTime: 3,
				endTime: 21,
				forgingStatus: true,
				height: 5,
				slotNumber: 4,
				startTime: 19,
				timestamp: 19,
			},
			{
				blockTime: 4,
				endTime: 25,
				forgingStatus: true,
				height: 6,
				slotNumber: 5,
				startTime: 22,
				timestamp: 22,
			},
			{
				blockTime: 4,
				endTime: 29,
				forgingStatus: true,
				height: 7,
				slotNumber: 6,
				startTime: 26,
				timestamp: 26,
			},
		];

		const endSlotTimeResults = [
			{
				blockTime: 8,
				endTime: 7,
				forgingStatus: false,
				height: 1,
				slotNumber: 0,
				startTime: 0,
				timestamp: 7,
			},
			{
				blockTime: 4,
				endTime: 11,
				forgingStatus: false,
				height: 2,
				slotNumber: 1,
				startTime: 8,
				timestamp: 11,
			},
			{
				blockTime: 4,
				endTime: 15,
				forgingStatus: false,
				height: 3,
				slotNumber: 2,
				startTime: 12,
				timestamp: 15,
			},
			{
				blockTime: 3,
				endTime: 18,
				forgingStatus: false,
				height: 4,
				slotNumber: 3,
				startTime: 16,
				timestamp: 18,
			},
			{
				blockTime: 3,
				endTime: 21,
				forgingStatus: false,
				height: 5,
				slotNumber: 4,
				startTime: 19,
				timestamp: 21,
			},
			{
				blockTime: 4,
				endTime: 25,
				forgingStatus: false,
				height: 6,
				slotNumber: 5,
				startTime: 22,
				timestamp: 25,
			},
			{
				blockTime: 4,
				endTime: 29,
				forgingStatus: false,
				height: 7,
				slotNumber: 6,
				startTime: 26,
				timestamp: 29,
			},
		];

		const missedBlocks = [
			{
				blockTime: 4,
				endTime: 19,
				forgingStatus: true,
				height: 3,
				slotNumber: 3,
				startTime: 16,
				timestamp: 16,
			},
			{
				blockTime: 4,
				endTime: 23,
				forgingStatus: true,
				height: 3,
				slotNumber: 4,
				startTime: 20,
				timestamp: 20,
			},
			{
				blockTime: 4,
				endTime: 27,
				forgingStatus: true,
				height: 3,
				slotNumber: 5,
				startTime: 24,
				timestamp: 24,
			},
			{
				blockTime: 4,
				endTime: 27,
				forgingStatus: false,
				height: 3,
				slotNumber: 5,
				startTime: 24,
				timestamp: 27,
			},
			{
				blockTime: 3,
				endTime: 21,
				forgingStatus: true,
				height: 4,
				slotNumber: 4,
				startTime: 19,
				timestamp: 19,
			},
			{
				blockTime: 3,
				endTime: 24,
				forgingStatus: true,
				height: 4,
				slotNumber: 5,
				startTime: 22,
				timestamp: 22,
			},
			{
				blockTime: 3,
				endTime: 24,
				forgingStatus: false,
				height: 4,
				slotNumber: 5,
				startTime: 22,
				timestamp: 24,
			},
			{
				blockTime: 4,
				endTime: 33,
				forgingStatus: true,
				height: 7,
				slotNumber: 7,
				startTime: 30,
				timestamp: 30,
			},
			{
				blockTime: 4,
				endTime: 37,
				forgingStatus: true,
				height: 7,
				slotNumber: 8,
				startTime: 34,
				timestamp: 34,
			},
			{
				blockTime: 4,
				endTime: 37,
				forgingStatus: false,
				height: 7,
				slotNumber: 8,
				startTime: 34,
				timestamp: 37,
			},
		];

		for (const item of [...expectedResults, ...endSlotTimeResults, ...missedBlocks]) {
			assert.equal(context.slots.getSlotInfo(getTimeStampForBlock, item.timestamp, item.height), {
				blockTime: item.blockTime,
				endTime: item.endTime,
				forgingStatus: item.forgingStatus,
				slotNumber: item.slotNumber,
				startTime: item.startTime,
			});
		}
	});

	it("isForgingAllowed / returns true when over half the time in the block remains", (context) => {
		const getTimeStampForBlock = (height: number) => {
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

		context.configuration.set("milestones", [
			{ blocktime: 8, height: 1 },
			{ blocktime: 7, height: 3 },
			{ blocktime: 5, height: 4 },
		]);

		assert.true(context.slots.isForgingAllowed(getTimeStampForBlock, 0, 1));
		assert.true(context.slots.isForgingAllowed(getTimeStampForBlock, 1, 1));
		assert.true(context.slots.isForgingAllowed(getTimeStampForBlock, 3, 1));
		assert.true(context.slots.isForgingAllowed(getTimeStampForBlock, 8, 2));
		assert.true(context.slots.isForgingAllowed(getTimeStampForBlock, 11, 2));
		assert.true(context.slots.isForgingAllowed(getTimeStampForBlock, 16, 3));
		assert.true(context.slots.isForgingAllowed(getTimeStampForBlock, 18, 3));
		assert.true(context.slots.isForgingAllowed(getTimeStampForBlock, 23, 4));
		assert.true(context.slots.isForgingAllowed(getTimeStampForBlock, 28, 5));
		assert.true(context.slots.isForgingAllowed(getTimeStampForBlock, 29, 5));
	});

	it("isForgingAllowed / returns false when under half the time in the block remains", (context) => {
		const getTimeStampForBlock = (height: number) => {
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

		context.configuration.set("milestones", [
			{ blocktime: 8, height: 1 },
			{ blocktime: 7, height: 3 },
			{ blocktime: 5, height: 4 },
		]);

		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 4, 1));
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 5, 1));
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 6, 1));
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 7, 1));
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 12, 2));
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 15, 2));
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 19, 3));
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 22, 3));
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 25, 4));
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 26, 4));
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 27, 4));
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 30, 5));
		assert.false(context.slots.isForgingAllowed(getTimeStampForBlock, 32, 5));
	});
});

describe<{
	configuration: Configuration;
	slots: Slots;
}>("Missed Slots", ({ assert, beforeEach, it }) => {
	beforeEach(setup);

	it("should calculate the slot time correctly when slots have been missed", (context) => {
		context.configuration.set("milestones", [
			{ blocktime: 4, height: 1 },
			{ blocktime: 3, height: 4 },
			{ blocktime: 4, height: 7 },
		]);

		const getTimeStampForBlock = (height: number) => {
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

		for (const item of [...expectedResults, ...missedBlocks]) {
			assert.equal(context.slots.getSlotTime(getTimeStampForBlock, item.slot, item.height), item.slotTime);
		}
	});

	it("getSlotInfo / should return positive values when called without timestamp", (context) => {
		const getTimeStampForBlock = (height: number) => {
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

		context.configuration.set("milestones", [
			{ blocktime: 4, epoch: "2017-03-21T13:00:00.000Z", height: 1 },
			{ blocktime: 3, height: 4 },
			{ blocktime: 4, height: 7 },
		]);

		const slotInfo = context.slots.getSlotInfo(getTimeStampForBlock);

		assert.positive(slotInfo.startTime);
		assert.positive(slotInfo.endTime);
		assert.gte(slotInfo.blockTime, 3);
		assert.lte(slotInfo.blockTime, 4);
		assert.positive(slotInfo.slotNumber);
		assert.boolean(slotInfo.forgingStatus);
	});

	it("getSlotInfo / should calculate the next slot correctly when slots have been missed", (context) => {
		const getTimeStampForBlock = (height: number) => {
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

		context.configuration.set("milestones", [
			{ blocktime: 4, epoch: "2017-03-21T13:00:00.000Z", height: 1 },
			{ blocktime: 3, height: 4 },
			{ blocktime: 4, height: 7 },
		]);

		const expectedResults = [
			{
				blockTime: 4,
				endTime: 3,
				forgingStatus: true,
				height: 1,
				slotNumber: 0,
				startTime: 0,
				timestamp: 0,
			},
			{
				blockTime: 4,
				endTime: 3,
				forgingStatus: true,
				height: 1,
				slotNumber: 0,
				startTime: 0,
				timestamp: 1,
			},
			{
				blockTime: 4,
				endTime: 7,
				forgingStatus: true,
				height: 2,
				slotNumber: 1,
				startTime: 4,
				timestamp: 4,
			},
			{
				blockTime: 4,
				endTime: 11,
				forgingStatus: true,
				height: 3,
				slotNumber: 2,
				startTime: 8,
				timestamp: 8,
			},
			{
				blockTime: 3,
				endTime: 22,
				forgingStatus: true,
				height: 4,
				slotNumber: 5,
				startTime: 20,
				timestamp: 20,
			},
			{
				blockTime: 3,
				endTime: 25,
				forgingStatus: true,
				height: 5,
				slotNumber: 6,
				startTime: 23,
				timestamp: 23,
			},
			{
				blockTime: 3,
				endTime: 31,
				forgingStatus: true,
				height: 6,
				slotNumber: 8,
				startTime: 29,
				timestamp: 29,
			},
			{
				blockTime: 4,
				endTime: 35,
				forgingStatus: true,
				height: 7,
				slotNumber: 9,
				startTime: 32,
				timestamp: 32,
			},
			{
				blockTime: 4,
				endTime: 43,
				forgingStatus: true,
				height: 8,
				slotNumber: 11,
				startTime: 40,
				timestamp: 40,
			},
			{
				blockTime: 4,
				endTime: 43,
				forgingStatus: true,
				height: 8,
				slotNumber: 11,
				startTime: 40,
				timestamp: 41,
			},
		];

		const offTimeResults = [
			{
				blockTime: 4,
				endTime: 3,
				forgingStatus: false,
				height: 1,
				slotNumber: 0,
				startTime: 0,
				timestamp: 2,
			},
			{
				blockTime: 4,
				endTime: 3,
				forgingStatus: false,
				height: 1,
				slotNumber: 0,
				startTime: 0,
				timestamp: 3,
			},
			{
				blockTime: 4,
				endTime: 7,
				forgingStatus: false,
				height: 2,
				slotNumber: 1,
				startTime: 4,
				timestamp: 7,
			},
			{
				blockTime: 4,
				endTime: 11,
				forgingStatus: false,
				height: 3,
				slotNumber: 2,
				startTime: 8,
				timestamp: 11,
			},
			{
				blockTime: 3,
				endTime: 22,
				forgingStatus: false,
				height: 4,
				slotNumber: 5,
				startTime: 20,
				timestamp: 22,
			},
			{
				blockTime: 3,
				endTime: 25,
				forgingStatus: false,
				height: 5,
				slotNumber: 6,
				startTime: 23,
				timestamp: 25,
			},
			{
				blockTime: 3,
				endTime: 31,
				forgingStatus: false,
				height: 6,
				slotNumber: 8,
				startTime: 29,
				timestamp: 31,
			},
			{
				blockTime: 4,
				endTime: 35,
				forgingStatus: false,
				height: 7,
				slotNumber: 9,
				startTime: 32,
				timestamp: 35,
			},
			{
				blockTime: 4,
				endTime: 43,
				forgingStatus: false,
				height: 8,
				slotNumber: 11,
				startTime: 40,
				timestamp: 42,
			},
			{
				blockTime: 4,
				endTime: 43,
				forgingStatus: false,
				height: 8,
				slotNumber: 11,
				startTime: 40,
				timestamp: 43,
			},
		];

		const missedSlots = [
			{
				blockTime: 4,
				endTime: 15,
				forgingStatus: true,
				height: 3,
				slotNumber: 3,
				startTime: 12,
				timestamp: 12,
			},
			{
				blockTime: 4,
				endTime: 19,
				forgingStatus: true,
				height: 3,
				slotNumber: 4,
				startTime: 16,
				timestamp: 16,
			},
			{
				blockTime: 3,
				endTime: 28,
				forgingStatus: true,
				height: 5,
				slotNumber: 7,
				startTime: 26,
				timestamp: 26,
			},
			{
				blockTime: 4,
				endTime: 39,
				forgingStatus: true,
				height: 7,
				slotNumber: 10,
				startTime: 36,
				timestamp: 36,
			},
		];

		const missedOffTimeResults = [
			{
				blockTime: 4,
				endTime: 15,
				forgingStatus: false,
				height: 3,
				slotNumber: 3,
				startTime: 12,
				timestamp: 15,
			},
			{
				blockTime: 4,
				endTime: 19,
				forgingStatus: false,
				height: 3,
				slotNumber: 4,
				startTime: 16,
				timestamp: 19,
			},
			{
				blockTime: 3,
				endTime: 28,
				forgingStatus: false,
				height: 5,
				slotNumber: 7,
				startTime: 26,
				timestamp: 28,
			},
			{
				blockTime: 4,
				endTime: 39,
				forgingStatus: false,
				height: 7,
				slotNumber: 10,
				startTime: 36,
				timestamp: 39,
			},
		];

		for (const item of [...expectedResults, ...offTimeResults, ...missedSlots, ...missedOffTimeResults]) {
			assert.equal(context.slots.getSlotInfo(getTimeStampForBlock, item.timestamp, item.height), {
				blockTime: item.blockTime,
				endTime: item.endTime,
				forgingStatus: item.forgingStatus,
				slotNumber: item.slotNumber,
				startTime: item.startTime,
			});
		}
	});
});
