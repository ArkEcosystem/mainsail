import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { Application } from "@arkecosystem/core-kernel";
import dayjs from "dayjs";

import { describe } from "../../core-test-framework/source";
import { BlockTimeCalculator } from "./block-time-calculator";
import { Slots } from "./slots";

const setup = (context) => {
	context.app = new Application(new Container());

	context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
	context.app.bind(Identifiers.Cryptography.Time.BlockTimeLookup).toConstantValue({
		getBlockTimeLookup: (height: number) => {
			switch (height) {
				case 1:
					return 1_646_870_400;
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		},
	});
	context.app.bind(Identifiers.Cryptography.Time.BlockTimeCalculator).to(BlockTimeCalculator).inSingletonScope();

	context.app
		.get<Configuration>(Identifiers.Cryptography.Configuration)
		.setConfig(require("../../core/bin/config/testnet/crypto.json"));

	context.configuration = context.app.get(Identifiers.Cryptography.Configuration);
	context.slots = context.app.resolve(Slots);
};

const genesisTimestamp = (configuration: Configuration, seconds = 0): number =>
	dayjs(configuration.getMilestone().epoch).unix() + seconds;

describe<{
	app: Application;
	configuration: Configuration;
	slots: Slots;
}>("Constant Slot Time", ({ assert, beforeEach, it }) => {
	beforeEach(setup);

	it("return epoch time as number", (context) => {
		assert.number(context.slots.getTime());
		assert.is(context.slots.getTime(1_646_870_400), genesisTimestamp(context.configuration));
	});

	it("return slot number", async (context) => {
		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration), 1), 0);
		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 4), 1), 0);
		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 7), 1), 0);

		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 8), 2), 1);
		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 9), 2), 1);
		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 10), 2), 1);
		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 11), 2), 1);
		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 15), 2), 1);

		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 16), 3), 2);
		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 20), 3), 2);

		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 24), 4), 3);

		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 8000), 1001), 1000);

		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 15_000), 1876), 1875);

		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 169_000), 21_126), 21_125);
		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 169_001), 21_126), 21_125);
		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 169_005), 21_126), 21_125);
		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 169_007), 21_126), 21_125);
	});

	it("returns slot time", async (context) => {
		assert.is(await context.slots.getSlotTime(1, 2), genesisTimestamp(context.configuration, 8));
		assert.is(await context.slots.getSlotTime(8, 9), genesisTimestamp(context.configuration, 64));
		assert.is(await context.slots.getSlotTime(50, 51), genesisTimestamp(context.configuration, 400));
		assert.is(await context.slots.getSlotTime(8888, 8889), genesisTimestamp(context.configuration, 71_104));
		assert.is(await context.slots.getSlotTime(19_614, 19_615), genesisTimestamp(context.configuration, 156_912));
		assert.is(await context.slots.getSlotTime(19_700, 19_701), genesisTimestamp(context.configuration, 157_600));
		assert.is(await context.slots.getSlotTime(169_000, 1), genesisTimestamp(context.configuration, 1_352_000));
	});

	it("getSlotInfo / should return positive values when called without timestamp", async (context) => {
		const slotInfo = await context.slots.getSlotInfo();

		assert.positive(slotInfo.startTime);
		assert.positive(slotInfo.endTime);
		assert.positive(slotInfo.blockTime);
		assert.positive(slotInfo.slotNumber);
		assert.boolean(slotInfo.forgingStatus);
	});

	it("getSlotInfo / should return correct values", async (context) => {
		const expectedResults = [
			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 7),
				forgingStatus: true,
				height: 1,
				slotNumber: 0,
				startTime: genesisTimestamp(context.configuration, 0),
				timestamp: genesisTimestamp(context.configuration, 0),
			},
			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 15),
				forgingStatus: true,
				height: 2,
				slotNumber: 1,
				startTime: genesisTimestamp(context.configuration, 8),
				timestamp: genesisTimestamp(context.configuration, 8),
			},
			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 23),
				forgingStatus: true,
				height: 3,
				slotNumber: 2,
				startTime: genesisTimestamp(context.configuration, 16),
				timestamp: genesisTimestamp(context.configuration, 16),
			},
			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 31),
				forgingStatus: true,
				height: 4,
				slotNumber: 3,
				startTime: genesisTimestamp(context.configuration, 24),
				timestamp: genesisTimestamp(context.configuration, 24),
			},

			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 31),
				forgingStatus: true,
				height: 4,
				slotNumber: 3,
				startTime: genesisTimestamp(context.configuration, 24),
				timestamp: genesisTimestamp(context.configuration, 25),
			},
			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 31),
				forgingStatus: true,
				height: 4,
				slotNumber: 3,
				startTime: genesisTimestamp(context.configuration, 24),
				timestamp: genesisTimestamp(context.configuration, 26),
			},
			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 31),
				forgingStatus: true,
				height: 4,
				slotNumber: 3,
				startTime: genesisTimestamp(context.configuration, 24),
				timestamp: genesisTimestamp(context.configuration, 27),
			},
		];

		const endSlotTimeResults = [
			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 7),
				forgingStatus: false,
				height: 1,
				slotNumber: 0,
				startTime: genesisTimestamp(context.configuration, 0),
				timestamp: genesisTimestamp(context.configuration, 7),
			},
			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 15),
				forgingStatus: false,
				height: 2,
				slotNumber: 1,
				startTime: genesisTimestamp(context.configuration, 8),
				timestamp: genesisTimestamp(context.configuration, 15),
			},
			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 23),
				forgingStatus: false,
				height: 3,
				slotNumber: 2,
				startTime: genesisTimestamp(context.configuration, 16),
				timestamp: genesisTimestamp(context.configuration, 23),
			},
			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 31),
				forgingStatus: false,
				height: 4,
				slotNumber: 3,
				startTime: genesisTimestamp(context.configuration, 24),
				timestamp: genesisTimestamp(context.configuration, 31),
			},

			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 31),
				forgingStatus: false,
				height: 4,
				slotNumber: 3,
				startTime: genesisTimestamp(context.configuration, 24),
				timestamp: genesisTimestamp(context.configuration, 30),
			},
			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 31),
				forgingStatus: false,
				height: 4,
				slotNumber: 3,
				startTime: genesisTimestamp(context.configuration, 24),
				timestamp: genesisTimestamp(context.configuration, 29),
			},
			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 31),
				forgingStatus: false,
				height: 4,
				slotNumber: 3,
				startTime: genesisTimestamp(context.configuration, 24),
				timestamp: genesisTimestamp(context.configuration, 28),
			},
		];

		const missedBlocks = [
			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 31),
				forgingStatus: true,
				height: 2,
				slotNumber: 3,
				startTime: genesisTimestamp(context.configuration, 24),
				timestamp: genesisTimestamp(context.configuration, 24),
			},
			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 31),
				forgingStatus: false,
				height: 2,
				slotNumber: 3,
				startTime: genesisTimestamp(context.configuration, 24),
				timestamp: genesisTimestamp(context.configuration, 31),
			},
		];

		for (const item of [...expectedResults, ...endSlotTimeResults, ...missedBlocks]) {
			assert.equal(await context.slots.getSlotInfo(item.timestamp, item.height), {
				blockTime: item.blockTime,
				endTime: item.endTime,
				forgingStatus: item.forgingStatus,
				slotNumber: item.slotNumber,
				startTime: item.startTime,
			});
		}
	});

	it("returns next slot", async (context) => {
		assert.number(await context.slots.getNextSlot());
	});

	it("returns next slot when height is defined in configManager", async (context) => {
		context.configuration.setHeight(12);

		assert.number(await context.slots.getNextSlot());
	});

	it("isForgingAllowed / returns boolean", async (context) => {
		assert.boolean(await context.slots.isForgingAllowed());
	});

	it("isForgingAllowed / returns true when over half the time in the block remains", async (context) => {
		assert.true(await context.slots.isForgingAllowed(0));
		assert.true(await context.slots.isForgingAllowed(1));
		assert.true(await context.slots.isForgingAllowed(3));
		assert.true(await context.slots.isForgingAllowed(8));
		assert.true(await context.slots.isForgingAllowed(16));
	});

	it("isForgingAllowed / returns false when under half the time in the block remains", async (context) => {
		assert.false(await context.slots.isForgingAllowed(4));
		assert.false(await context.slots.isForgingAllowed(5));
		assert.false(await context.slots.isForgingAllowed(6));
		assert.false(await context.slots.isForgingAllowed(7));
		assert.false(await context.slots.isForgingAllowed(15));
	});

	it("getTimeInMsUntilNextSlot", async (context) => {
		const nextSlotTime = await context.slots.getSlotTime(await context.slots.getNextSlot());
		const now = context.slots.getTime();

		assert.is(await context.slots.getTimeInMsUntilNextSlot(), (nextSlotTime - now) * 1000);
	});
});

describe<{
	app: Application;
	configuration: Configuration;
	slots: Slots;
}>("Dynamic Slot Time", ({ assert, beforeEach, it }) => {
	beforeEach(setup);

	it("should return the correct slot number given a timestamp within a known height", async (context) => {
		context.configuration.set("milestones", [
			{ blockTime: 9, height: 1 },
			{ blockTime: 8, height: 3 },
			{ blockTime: 5, height: 4 },
		]);

		context.app.rebind(Identifiers.Cryptography.Time.BlockTimeLookup).toConstantValue({
			getBlockTimeLookup: (height: number) => {
				switch (height) {
					case 1:
						return genesisTimestamp(context.configuration, 0);
					case 2:
						return genesisTimestamp(context.configuration, 9);
					case 3:
						return genesisTimestamp(context.configuration, 18);
					default:
						throw new Error(`Test scenarios should not hit this line`);
				}
			},
		});

		context.slots = context.app.resolve(Slots);

		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 1), 1), 0);
		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 8), 1), 0);

		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 9), 2), 1);
		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 17), 2), 1);

		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 18), 3), 2);
		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 25), 3), 2);

		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 26), 4), 3);
		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 30), 4), 3);

		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 31), 5), 4);
		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 35), 5), 4);

		assert.is(await context.slots.getSlotNumber(genesisTimestamp(context.configuration, 36), 6), 5);
	});

	it("getSlotTime", async (context) => {
		context.configuration.set("milestones", [
			{ blockTime: 8, height: 1 },
			{ blockTime: 9, height: 3 },
			{ blockTime: 10, height: 6 },
			{ blockTime: 8, height: 8 },
		]);

		context.app.rebind(Identifiers.Cryptography.Time.BlockTimeLookup).toConstantValue({
			getBlockTimeLookup: (height: number) => {
				switch (height) {
					case 1:
						return genesisTimestamp(context.configuration, 0);
					case 2:
						return genesisTimestamp(context.configuration, 8);
					case 3:
						return genesisTimestamp(context.configuration, 16);
					case 5:
						return genesisTimestamp(context.configuration, 34);
					case 6:
						return genesisTimestamp(context.configuration, 43);
					case 7:
						return genesisTimestamp(context.configuration, 53);
					default:
						throw new Error(`Test scenarios should not hit this line`);
				}
			},
		});

		context.slots = context.app.resolve(Slots);

		assert.is(await context.slots.getSlotTime(0, 2), genesisTimestamp(context.configuration, 0));
		assert.is(await context.slots.getSlotTime(2, 3), genesisTimestamp(context.configuration, 16));
		assert.is(await context.slots.getSlotTime(3, 4), genesisTimestamp(context.configuration, 25));
		assert.is(await context.slots.getSlotTime(4, 5), genesisTimestamp(context.configuration, 34));
		assert.is(await context.slots.getSlotTime(5, 6), genesisTimestamp(context.configuration, 43));
		assert.is(await context.slots.getSlotTime(6, 7), genesisTimestamp(context.configuration, 53));
		assert.is(await context.slots.getSlotTime(7, 8), genesisTimestamp(context.configuration, 63));
		assert.is(await context.slots.getSlotTime(8, 9), genesisTimestamp(context.configuration, 71));
		assert.is(await context.slots.getSlotTime(14, 15), genesisTimestamp(context.configuration, 119));
	});

	it("getSlotInfo / should return correct values", async (context) => {
		context.configuration.set("milestones", [
			{ blockTime: 8, height: 1 },
			{ blockTime: 4, height: 2 },
			{ blockTime: 3, height: 4 },
			{ blockTime: 4, height: 6 },
		]);

		context.app.rebind(Identifiers.Cryptography.Time.BlockTimeLookup).toConstantValue({
			getBlockTimeLookup: (height: number) => {
				switch (height) {
					case 1:
						return genesisTimestamp(context.configuration, 0);
					case 2:
						return genesisTimestamp(context.configuration, 8);
					case 3:
						return genesisTimestamp(context.configuration, 12);
					case 4:
						return genesisTimestamp(context.configuration, 16);
					case 5:
						return genesisTimestamp(context.configuration, 19);
					default:
						throw new Error(`Test scenarios should not hit this line`);
				}
			},
		});

		context.slots = context.app.resolve(Slots);

		const expectedResults = [
			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 7),
				forgingStatus: true,
				height: 1,
				slotNumber: 0,
				startTime: genesisTimestamp(context.configuration, 0),
				timestamp: genesisTimestamp(context.configuration, 0),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 11),
				forgingStatus: true,
				height: 2,
				slotNumber: 1,
				startTime: genesisTimestamp(context.configuration, 8),
				timestamp: genesisTimestamp(context.configuration, 8),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 15),
				forgingStatus: true,
				height: 3,
				slotNumber: 2,
				startTime: genesisTimestamp(context.configuration, 12),
				timestamp: genesisTimestamp(context.configuration, 12),
			},
			{
				blockTime: 3,
				endTime: genesisTimestamp(context.configuration, 18),
				forgingStatus: true,
				height: 4,
				slotNumber: 3,
				startTime: genesisTimestamp(context.configuration, 16),
				timestamp: genesisTimestamp(context.configuration, 16),
			},
			{
				blockTime: 3,
				endTime: genesisTimestamp(context.configuration, 21),
				forgingStatus: true,
				height: 5,
				slotNumber: 4,
				startTime: genesisTimestamp(context.configuration, 19),
				timestamp: genesisTimestamp(context.configuration, 19),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 25),
				forgingStatus: true,
				height: 6,
				slotNumber: 5,
				startTime: genesisTimestamp(context.configuration, 22),
				timestamp: genesisTimestamp(context.configuration, 22),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 29),
				forgingStatus: true,
				height: 7,
				slotNumber: 6,
				startTime: genesisTimestamp(context.configuration, 26),
				timestamp: genesisTimestamp(context.configuration, 26),
			},
		];

		const endSlotTimeResults = [
			{
				blockTime: 8,
				endTime: genesisTimestamp(context.configuration, 7),
				forgingStatus: false,
				height: 1,
				slotNumber: 0,
				startTime: genesisTimestamp(context.configuration, 0),
				timestamp: genesisTimestamp(context.configuration, 7),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 11),
				forgingStatus: false,
				height: 2,
				slotNumber: 1,
				startTime: genesisTimestamp(context.configuration, 8),
				timestamp: genesisTimestamp(context.configuration, 11),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 15),
				forgingStatus: false,
				height: 3,
				slotNumber: 2,
				startTime: genesisTimestamp(context.configuration, 12),
				timestamp: genesisTimestamp(context.configuration, 15),
			},
			{
				blockTime: 3,
				endTime: genesisTimestamp(context.configuration, 18),
				forgingStatus: false,
				height: 4,
				slotNumber: 3,
				startTime: genesisTimestamp(context.configuration, 16),
				timestamp: genesisTimestamp(context.configuration, 18),
			},
			{
				blockTime: 3,
				endTime: genesisTimestamp(context.configuration, 21),
				forgingStatus: false,
				height: 5,
				slotNumber: 4,
				startTime: genesisTimestamp(context.configuration, 19),
				timestamp: genesisTimestamp(context.configuration, 21),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 25),
				forgingStatus: false,
				height: 6,
				slotNumber: 5,
				startTime: genesisTimestamp(context.configuration, 22),
				timestamp: genesisTimestamp(context.configuration, 25),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 29),
				forgingStatus: false,
				height: 7,
				slotNumber: 6,
				startTime: genesisTimestamp(context.configuration, 26),
				timestamp: genesisTimestamp(context.configuration, 29),
			},
		];

		const missedBlocks = [
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 19),
				forgingStatus: true,
				height: 3,
				slotNumber: 3,
				startTime: genesisTimestamp(context.configuration, 16),
				timestamp: genesisTimestamp(context.configuration, 16),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 23),
				forgingStatus: true,
				height: 3,
				slotNumber: 4,
				startTime: genesisTimestamp(context.configuration, 20),
				timestamp: genesisTimestamp(context.configuration, 20),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 27),
				forgingStatus: true,
				height: 3,
				slotNumber: 5,
				startTime: genesisTimestamp(context.configuration, 24),
				timestamp: genesisTimestamp(context.configuration, 24),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 27),
				forgingStatus: false,
				height: 3,
				slotNumber: 5,
				startTime: genesisTimestamp(context.configuration, 24),
				timestamp: genesisTimestamp(context.configuration, 27),
			},
			{
				blockTime: 3,
				endTime: genesisTimestamp(context.configuration, 21),
				forgingStatus: true,
				height: 4,
				slotNumber: 4,
				startTime: genesisTimestamp(context.configuration, 19),
				timestamp: genesisTimestamp(context.configuration, 19),
			},
			{
				blockTime: 3,
				endTime: genesisTimestamp(context.configuration, 24),
				forgingStatus: true,
				height: 4,
				slotNumber: 5,
				startTime: genesisTimestamp(context.configuration, 22),
				timestamp: genesisTimestamp(context.configuration, 22),
			},
			{
				blockTime: 3,
				endTime: genesisTimestamp(context.configuration, 24),
				forgingStatus: false,
				height: 4,
				slotNumber: 5,
				startTime: genesisTimestamp(context.configuration, 22),
				timestamp: genesisTimestamp(context.configuration, 24),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 33),
				forgingStatus: true,
				height: 7,
				slotNumber: 7,
				startTime: genesisTimestamp(context.configuration, 30),
				timestamp: genesisTimestamp(context.configuration, 30),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 37),
				forgingStatus: true,
				height: 7,
				slotNumber: 8,
				startTime: genesisTimestamp(context.configuration, 34),
				timestamp: genesisTimestamp(context.configuration, 34),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 37),
				forgingStatus: false,
				height: 7,
				slotNumber: 8,
				startTime: genesisTimestamp(context.configuration, 34),
				timestamp: genesisTimestamp(context.configuration, 37),
			},
		];

		for (const item of [...expectedResults, ...endSlotTimeResults, ...missedBlocks]) {
			assert.equal(await context.slots.getSlotInfo(item.timestamp, item.height), {
				blockTime: item.blockTime,
				endTime: item.endTime,
				forgingStatus: item.forgingStatus,
				slotNumber: item.slotNumber,
				startTime: item.startTime,
			});
		}
	});

	it("isForgingAllowed / returns true when over half the time in the block remains", async (context) => {
		context.configuration.set("milestones", [
			{ blockTime: 8, height: 1 },
			{ blockTime: 7, height: 3 },
			{ blockTime: 5, height: 4 },
		]);

		context.app.rebind(Identifiers.Cryptography.Time.BlockTimeLookup).toConstantValue({
			getBlockTimeLookup: (height: number) => {
				switch (height) {
					case 1:
						return genesisTimestamp(context.configuration, 0);
					case 2:
						return genesisTimestamp(context.configuration, 8);
					case 3:
						return genesisTimestamp(context.configuration, 16);
					default:
						throw new Error(`Test scenarios should not hit this line`);
				}
			},
		});

		context.slots = context.app.resolve(Slots);

		assert.true(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 0), 1));
		assert.true(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 1), 1));
		assert.true(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 3), 1));
		assert.true(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 8), 2));
		assert.true(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 11), 2));
		assert.true(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 16), 3));
		assert.true(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 18), 3));
		assert.true(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 23), 4));
		assert.true(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 28), 5));
		assert.true(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 29), 5));
	});

	it("isForgingAllowed / returns false when under half the time in the block remains", async (context) => {
		context.configuration.set("milestones", [
			{ blockTime: 8, height: 1 },
			{ blockTime: 7, height: 3 },
			{ blockTime: 5, height: 4 },
		]);

		context.app.rebind(Identifiers.Cryptography.Time.BlockTimeLookup).toConstantValue({
			getBlockTimeLookup: (height: number) => {
				switch (height) {
					case 1:
						return genesisTimestamp(context.configuration, 0);
					case 2:
						return genesisTimestamp(context.configuration, 8);
					case 3:
						return genesisTimestamp(context.configuration, 16);
					default:
						throw new Error(`Test scenarios should not hit this line`);
				}
			},
		});

		context.slots = context.app.resolve(Slots);

		assert.false(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 4), 1));
		assert.false(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 5), 1));
		assert.false(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 6), 1));
		assert.false(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 7), 1));
		assert.false(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 12), 2));
		assert.false(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 15), 2));
		assert.false(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 19), 3));
		assert.false(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 22), 3));
		assert.false(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 25), 4));
		assert.false(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 26), 4));
		assert.false(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 27), 4));
		assert.false(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 30), 5));
		assert.false(await context.slots.isForgingAllowed(genesisTimestamp(context.configuration, 32), 5));
	});
});

describe<{
	app: Application;
	configuration: Configuration;
	slots: Slots;
}>("Missed Slots", ({ assert, beforeEach, it }) => {
	beforeEach(setup);

	it("should calculate the slot time correctly when slots have been missed", async (context) => {
		context.configuration.set("milestones", [
			{ blockTime: 4, height: 1 },
			{ blockTime: 3, height: 4 },
			{ blockTime: 4, height: 7 },
		]);

		context.app.rebind(Identifiers.Cryptography.Time.BlockTimeLookup).toConstantValue({
			getBlockTimeLookup: (height: number) => {
				switch (height) {
					case 1:
						return genesisTimestamp(context.configuration, 0);
					case 3:
						return genesisTimestamp(context.configuration, 8);
					case 4:
						return genesisTimestamp(context.configuration, 12);
					case 6:
						return genesisTimestamp(context.configuration, 18);
					default:
						throw new Error(`Test scenarios should not hit this line`);
				}
			},
		});

		context.slots = context.app.resolve(Slots);

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
			assert.equal(
				await context.slots.getSlotTime(item.slot, item.height),
				genesisTimestamp(context.configuration, item.slotTime),
			);
		}
	});

	it("getSlotInfo / should return positive values when called without timestamp", async (context) => {
		context.configuration.set("milestones", [
			{ blockTime: 4, epoch: "2017-03-21T13:00:00.000Z", height: 1 },
			{ blockTime: 3, height: 4 },
			{ blockTime: 4, height: 7 },
		]);

		context.app.rebind(Identifiers.Cryptography.Time.BlockTimeLookup).toConstantValue({
			getBlockTimeLookup: (height: number) => {
				switch (height) {
					case 1:
						return genesisTimestamp(context.configuration, 0);
					case 3:
						return genesisTimestamp(context.configuration, 16);
					case 4:
						return genesisTimestamp(context.configuration, 20);
					case 6:
						return genesisTimestamp(context.configuration, 29);
					default:
						throw new Error(`Test scenarios should not hit this line`);
				}
			},
		});

		context.slots = context.app.resolve(Slots);

		const slotInfo = await context.slots.getSlotInfo();

		assert.positive(slotInfo.startTime);
		assert.positive(slotInfo.endTime);
		assert.gte(slotInfo.blockTime, 3);
		assert.lte(slotInfo.blockTime, 4);
		assert.positive(slotInfo.slotNumber);
		assert.boolean(slotInfo.forgingStatus);
	});

	it("getSlotInfo / should calculate the next slot correctly when slots have been missed", async (context) => {
		context.configuration.set("milestones", [
			{ blockTime: 4, epoch: "2017-03-21T13:00:00.000Z", height: 1 },
			{ blockTime: 3, height: 4 },
			{ blockTime: 4, height: 7 },
		]);

		context.app.rebind(Identifiers.Cryptography.Time.BlockTimeLookup).toConstantValue({
			getBlockTimeLookup: (height: number) => {
				switch (height) {
					case 1:
						return genesisTimestamp(context.configuration, 0);
					case 3:
						return genesisTimestamp(context.configuration, 16);
					case 4:
						return genesisTimestamp(context.configuration, 20);
					case 6:
						return genesisTimestamp(context.configuration, 29);
					default:
						throw new Error(`Test scenarios should not hit this line`);
				}
			},
		});

		context.slots = context.app.resolve(Slots);

		const expectedResults = [
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 3),
				forgingStatus: true,
				height: 1,
				slotNumber: 0,
				startTime: genesisTimestamp(context.configuration, 0),
				timestamp: genesisTimestamp(context.configuration, 0),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 3),
				forgingStatus: true,
				height: 1,
				slotNumber: 0,
				startTime: genesisTimestamp(context.configuration, 0),
				timestamp: genesisTimestamp(context.configuration, 1),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 7),
				forgingStatus: true,
				height: 2,
				slotNumber: 1,
				startTime: genesisTimestamp(context.configuration, 4),
				timestamp: genesisTimestamp(context.configuration, 4),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 11),
				forgingStatus: true,
				height: 3,
				slotNumber: 2,
				startTime: genesisTimestamp(context.configuration, 8),
				timestamp: genesisTimestamp(context.configuration, 8),
			},
			{
				blockTime: 3,
				endTime: genesisTimestamp(context.configuration, 22),
				forgingStatus: true,
				height: 4,
				slotNumber: 5,
				startTime: genesisTimestamp(context.configuration, 20),
				timestamp: genesisTimestamp(context.configuration, 20),
			},
			{
				blockTime: 3,
				endTime: genesisTimestamp(context.configuration, 25),
				forgingStatus: true,
				height: 5,
				slotNumber: 6,
				startTime: genesisTimestamp(context.configuration, 23),
				timestamp: genesisTimestamp(context.configuration, 23),
			},
			{
				blockTime: 3,
				endTime: genesisTimestamp(context.configuration, 31),
				forgingStatus: true,
				height: 6,
				slotNumber: 8,
				startTime: genesisTimestamp(context.configuration, 29),
				timestamp: genesisTimestamp(context.configuration, 29),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 35),
				forgingStatus: true,
				height: 7,
				slotNumber: 9,
				startTime: genesisTimestamp(context.configuration, 32),
				timestamp: genesisTimestamp(context.configuration, 32),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 43),
				forgingStatus: true,
				height: 8,
				slotNumber: 11,
				startTime: genesisTimestamp(context.configuration, 40),
				timestamp: genesisTimestamp(context.configuration, 40),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 43),
				forgingStatus: true,
				height: 8,
				slotNumber: 11,
				startTime: genesisTimestamp(context.configuration, 40),
				timestamp: genesisTimestamp(context.configuration, 41),
			},
		];

		const offTimeResults = [
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 3),
				forgingStatus: false,
				height: 1,
				slotNumber: 0,
				startTime: genesisTimestamp(context.configuration, 0),
				timestamp: genesisTimestamp(context.configuration, 2),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 3),
				forgingStatus: false,
				height: 1,
				slotNumber: 0,
				startTime: genesisTimestamp(context.configuration, 0),
				timestamp: genesisTimestamp(context.configuration, 3),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 7),
				forgingStatus: false,
				height: 2,
				slotNumber: 1,
				startTime: genesisTimestamp(context.configuration, 4),
				timestamp: genesisTimestamp(context.configuration, 7),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 11),
				forgingStatus: false,
				height: 3,
				slotNumber: 2,
				startTime: genesisTimestamp(context.configuration, 8),
				timestamp: genesisTimestamp(context.configuration, 11),
			},
			{
				blockTime: 3,
				endTime: genesisTimestamp(context.configuration, 22),
				forgingStatus: false,
				height: 4,
				slotNumber: 5,
				startTime: genesisTimestamp(context.configuration, 20),
				timestamp: genesisTimestamp(context.configuration, 22),
			},
			{
				blockTime: 3,
				endTime: genesisTimestamp(context.configuration, 25),
				forgingStatus: false,
				height: 5,
				slotNumber: 6,
				startTime: genesisTimestamp(context.configuration, 23),
				timestamp: genesisTimestamp(context.configuration, 25),
			},
			{
				blockTime: 3,
				endTime: genesisTimestamp(context.configuration, 31),
				forgingStatus: false,
				height: 6,
				slotNumber: 8,
				startTime: genesisTimestamp(context.configuration, 29),
				timestamp: genesisTimestamp(context.configuration, 31),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 35),
				forgingStatus: false,
				height: 7,
				slotNumber: 9,
				startTime: genesisTimestamp(context.configuration, 32),
				timestamp: genesisTimestamp(context.configuration, 35),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 43),
				forgingStatus: false,
				height: 8,
				slotNumber: 11,
				startTime: genesisTimestamp(context.configuration, 40),
				timestamp: genesisTimestamp(context.configuration, 42),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 43),
				forgingStatus: false,
				height: 8,
				slotNumber: 11,
				startTime: genesisTimestamp(context.configuration, 40),
				timestamp: genesisTimestamp(context.configuration, 43),
			},
		];

		const missedSlots = [
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 15),
				forgingStatus: true,
				height: 3,
				slotNumber: 3,
				startTime: genesisTimestamp(context.configuration, 12),
				timestamp: genesisTimestamp(context.configuration, 12),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 19),
				forgingStatus: true,
				height: 3,
				slotNumber: 4,
				startTime: genesisTimestamp(context.configuration, 16),
				timestamp: genesisTimestamp(context.configuration, 16),
			},
			{
				blockTime: 3,
				endTime: genesisTimestamp(context.configuration, 28),
				forgingStatus: true,
				height: 5,
				slotNumber: 7,
				startTime: genesisTimestamp(context.configuration, 26),
				timestamp: genesisTimestamp(context.configuration, 26),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 39),
				forgingStatus: true,
				height: 7,
				slotNumber: 10,
				startTime: genesisTimestamp(context.configuration, 36),
				timestamp: genesisTimestamp(context.configuration, 36),
			},
		];

		const missedOffTimeResults = [
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 15),
				forgingStatus: false,
				height: 3,
				slotNumber: 3,
				startTime: genesisTimestamp(context.configuration, 12),
				timestamp: genesisTimestamp(context.configuration, 15),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 19),
				forgingStatus: false,
				height: 3,
				slotNumber: 4,
				startTime: genesisTimestamp(context.configuration, 16),
				timestamp: genesisTimestamp(context.configuration, 19),
			},
			{
				blockTime: 3,
				endTime: genesisTimestamp(context.configuration, 28),
				forgingStatus: false,
				height: 5,
				slotNumber: 7,
				startTime: genesisTimestamp(context.configuration, 26),
				timestamp: genesisTimestamp(context.configuration, 28),
			},
			{
				blockTime: 4,
				endTime: genesisTimestamp(context.configuration, 39),
				forgingStatus: false,
				height: 7,
				slotNumber: 10,
				startTime: genesisTimestamp(context.configuration, 36),
				timestamp: genesisTimestamp(context.configuration, 39),
			},
		];

		for (const item of [...expectedResults, ...offTimeResults, ...missedSlots, ...missedOffTimeResults]) {
			assert.equal(await context.slots.getSlotInfo(item.timestamp, item.height), {
				blockTime: item.blockTime,
				endTime: item.endTime,
				forgingStatus: item.forgingStatus,
				slotNumber: item.slotNumber,
				startTime: item.startTime,
			});
		}
	});
});
