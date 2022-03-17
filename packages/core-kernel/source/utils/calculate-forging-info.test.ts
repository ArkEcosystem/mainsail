import { Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { BlockTimeCalculator } from "@arkecosystem/core-crypto-time/source/block-time-calculator";
import { BlockTimeLookup } from "@arkecosystem/core-crypto-time/source/block-time-lookup";
import { Slots } from "@arkecosystem/core-crypto-time/source/slots";

import crypto from "../../../core/bin/config/testnet/crypto.json";
import { describe, Sandbox } from "../../../core-test-framework";
import { calculateForgingInfo, getMilestonesWhichAffectActiveValidatorCount } from "./calculate-forging-info";

describe<{
	sandbox: Sandbox;
	configuration: Configuration;
}>("getMilestonesWhichAffectActiveDelegateCount", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.configuration = context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration);
	});

	it("should return milestones which changes delegate count", ({ configuration }) => {
		configuration.setConfig({
			...crypto,
			milestones: [{ activeValidators: 4, height: 1 }],
		});

		const milestones = [
			{ activeValidators: 4, height: 1 },
			{ activeValidators: 4, height: 5 },
			{ activeValidators: 8, height: 9 },
			{ activeValidators: 8, height: 15 },
		];

		const config = { ...crypto, milestones };
		configuration.setConfig({ ...crypto, milestones: milestones });

		assert.length(getMilestonesWhichAffectActiveValidatorCount(configuration), 2);
	});
});

describe<{
	sandbox: Sandbox;
	configuration: Configuration;
}>("calculateForgingInfo", ({ assert, beforeEach, it, stub }) => {
	const getTimestamp = (seconds = 0): number => crypto.genesisBlock.timestamp + seconds;

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.configuration = context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration);

		context.sandbox.app
			.bind(Identifiers.Cryptography.Time.BlockTimeCalculator)
			.to(BlockTimeCalculator)
			.inSingletonScope();
		context.sandbox.app.bind(Identifiers.Cryptography.Time.BlockTimeLookup).to(BlockTimeLookup).inSingletonScope();
		context.sandbox.app.bind(Identifiers.Cryptography.Time.Slots).to(Slots).inSingletonScope();
		context.sandbox.app.bind(Identifiers.Database.Service).toConstantValue({});
	});

	it("should calculate forgingInfo correctly for fixed block times", async ({ configuration, sandbox }) => {
		const milestones = [{ activeValidators: 4, blockTime: 8, epoch: crypto.milestones[0].epoch, height: 1 }];

		const config = { ...crypto, milestones };
		configuration.setConfig(config);

		const expectedResults = [
			{
				blockTimestamp: getTimestamp(0),
				canForge: true,
				currentForger: 0,
				height: 1,
				nextForger: 1,
				timestamp: getTimestamp(0),
			},
			{
				blockTimestamp: getTimestamp(8),
				canForge: true,
				currentForger: 1,
				height: 2,
				nextForger: 2,
				timestamp: getTimestamp(8),
			},
			{
				blockTimestamp: getTimestamp(16),
				canForge: true,
				currentForger: 2,
				height: 3,
				nextForger: 3,
				timestamp: getTimestamp(16),
			},
			{
				blockTimestamp: getTimestamp(24),
				canForge: true,
				currentForger: 3,
				height: 4,
				nextForger: 0,
				timestamp: getTimestamp(24),
			},
			{
				blockTimestamp: getTimestamp(32),
				canForge: true,
				currentForger: 0,
				height: 5,
				nextForger: 1,
				timestamp: getTimestamp(32),
			},
			{
				blockTimestamp: getTimestamp(40),
				canForge: true,
				currentForger: 1,
				height: 6,
				nextForger: 2,
				timestamp: getTimestamp(40),
			},
			{
				blockTimestamp: getTimestamp(48),
				canForge: true,
				currentForger: 2,
				height: 7,
				nextForger: 3,
				timestamp: getTimestamp(48),
			},
			{
				blockTimestamp: getTimestamp(56),
				canForge: true,
				currentForger: 3,
				height: 8,
				nextForger: 0,
				timestamp: getTimestamp(56),
			},
			{
				blockTimestamp: getTimestamp(64),
				canForge: true,
				currentForger: 0,
				height: 9,
				nextForger: 1,
				timestamp: getTimestamp(64),
			},
		];

		const offTimeResults = [
			{
				blockTimestamp: getTimestamp(0),
				canForge: false,
				currentForger: 0,
				height: 1,
				nextForger: 1,
				timestamp: getTimestamp(7),
			},
			{
				blockTimestamp: getTimestamp(8),
				canForge: false,
				currentForger: 1,
				height: 2,
				nextForger: 2,
				timestamp: getTimestamp(15),
			},
		];

		for (const item of expectedResults.concat(offTimeResults)) {
			assert.equal(await calculateForgingInfo(item.timestamp, item.height, sandbox.app), {
				blockTimestamp: item.blockTimestamp,
				canForge: item.canForge,
				currentForger: item.currentForger,
				nextForger: item.nextForger,
			});
		}
	});

	it("should calculate forgingInfo correctly for dynamic block times", async ({ configuration, sandbox }) => {
		const milestones = [
			{ activeValidators: 4, blockTime: 8, epoch: crypto.milestones[0].epoch, height: 1 },
			{ blockTime: 4, height: 2 },
			{ blockTime: 3, height: 4 },
			{ blockTime: 4, height: 6 },
		];

		stub(
			sandbox.app.get<BlockTimeCalculator>(Identifiers.Cryptography.Time.BlockTimeLookup),
			"getBlockTimeLookup",
		).callsFake((height: number) => {
			switch (height) {
				case 1:
					return getTimestamp(0);
				case 2:
					return getTimestamp(8);
				case 3:
					return getTimestamp(12);
				case 4:
					return getTimestamp(16);
				case 5:
					return getTimestamp(19);
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		});

		const config = { ...crypto, milestones };
		configuration.setConfig(config);

		const expectedResults = [
			{
				blockTimestamp: getTimestamp(0),
				canForge: true,
				currentForger: 0,
				height: 1,
				nextForger: 1,
				timestamp: getTimestamp(0),
			}, // + 8
			{
				blockTimestamp: getTimestamp(8),
				canForge: true,
				currentForger: 1,
				height: 2,
				nextForger: 2,
				timestamp: getTimestamp(8),
			}, // + 4
			{
				blockTimestamp: getTimestamp(12),
				canForge: true,
				currentForger: 2,
				height: 3,
				nextForger: 3,
				timestamp: getTimestamp(12),
			},
			{
				blockTimestamp: getTimestamp(16),
				canForge: true,
				currentForger: 3,
				height: 4,
				nextForger: 0,
				timestamp: getTimestamp(16),
			}, // + 3
			{
				blockTimestamp: getTimestamp(19),
				canForge: true,
				currentForger: 0,
				height: 5,
				nextForger: 1,
				timestamp: getTimestamp(19),
			},
			{
				blockTimestamp: getTimestamp(22),
				canForge: true,
				currentForger: 1,
				height: 6,
				nextForger: 2,
				timestamp: getTimestamp(22),
			}, // + 4
			{
				blockTimestamp: getTimestamp(26),
				canForge: true,
				currentForger: 2,
				height: 7,
				nextForger: 3,
				timestamp: getTimestamp(26),
			},
			{
				blockTimestamp: getTimestamp(30),
				canForge: true,
				currentForger: 3,
				height: 8,
				nextForger: 0,
				timestamp: getTimestamp(30),
			},
		];

		const offTimeResults = [
			{
				blockTimestamp: getTimestamp(0),
				canForge: false,
				currentForger: 0,
				height: 1,
				nextForger: 1,
				timestamp: getTimestamp(7),
			}, // + 8
			{
				blockTimestamp: getTimestamp(8),
				canForge: false,
				currentForger: 1,
				height: 2,
				nextForger: 2,
				timestamp: getTimestamp(11),
			}, // + 4
			{
				blockTimestamp: getTimestamp(12),
				canForge: false,
				currentForger: 2,
				height: 3,
				nextForger: 3,
				timestamp: getTimestamp(15),
			},
			{
				blockTimestamp: getTimestamp(16),
				canForge: false,
				currentForger: 3,
				height: 4,
				nextForger: 0,
				timestamp: getTimestamp(18),
			}, // + 3
			{
				blockTimestamp: getTimestamp(19),
				canForge: false,
				currentForger: 0,
				height: 5,
				nextForger: 1,
				timestamp: getTimestamp(21),
			},
			{
				blockTimestamp: getTimestamp(22),
				canForge: false,
				currentForger: 1,
				height: 6,
				nextForger: 2,
				timestamp: getTimestamp(25),
			}, // + 4
			{
				blockTimestamp: getTimestamp(26),
				canForge: false,
				currentForger: 2,
				height: 7,
				nextForger: 3,
				timestamp: getTimestamp(29),
			},
			{
				blockTimestamp: getTimestamp(30),
				canForge: false,
				currentForger: 3,
				height: 8,
				nextForger: 0,
				timestamp: getTimestamp(32),
			},
		];

		const missedBlocks = [
			{
				blockTimestamp: getTimestamp(12),
				canForge: true,
				currentForger: 2,
				height: 2,
				nextForger: 3,
				timestamp: getTimestamp(12),
			}, // + 4
			{
				blockTimestamp: getTimestamp(16),
				canForge: true,
				currentForger: 3,
				height: 2,
				nextForger: 0,
				timestamp: getTimestamp(16),
			},
			{
				blockTimestamp: getTimestamp(20),
				canForge: true,
				currentForger: 0,
				height: 2,
				nextForger: 1,
				timestamp: getTimestamp(20),
			},
			{
				blockTimestamp: getTimestamp(24),
				canForge: true,
				currentForger: 1,
				height: 2,
				nextForger: 2,
				timestamp: getTimestamp(24),
			},
			{
				blockTimestamp: getTimestamp(16),
				canForge: true,
				currentForger: 3,
				height: 3,
				nextForger: 0,
				timestamp: getTimestamp(16),
			},
			{
				blockTimestamp: getTimestamp(26),
				canForge: true,
				currentForger: 2,
				height: 6,
				nextForger: 3,
				timestamp: getTimestamp(26),
			},
		];

		for (const item of expectedResults.concat(offTimeResults).concat(missedBlocks)) {
			assert.equal(await calculateForgingInfo(item.timestamp, item.height, sandbox.app), {
				blockTimestamp: item.blockTimestamp,
				canForge: item.canForge,
				currentForger: item.currentForger,
				nextForger: item.nextForger,
			});
		}
	});

	it("should calculate forgingInfo correctly for dynamic block times and changing max delegate numbers", async ({
		sandbox,
		configuration,
	}) => {
		const milestones = [
			{ activeValidators: 4, blockTime: 4, epoch: crypto.milestones[0].epoch, height: 1 },
			{ blockTime: 3, height: 4 },
			{ activeValidators: 5, blockTime: 5, height: 5 },
		];

		const config = { ...crypto, milestones };
		configuration.setConfig(config);

		stub(
			sandbox.app.get<BlockTimeCalculator>(Identifiers.Cryptography.Time.BlockTimeLookup),
			"getBlockTimeLookup",
		).callsFake((height: number) => {
			switch (height) {
				case 1:
					return getTimestamp(0);
				case 3:
					return getTimestamp(8);
				case 4:
					return getTimestamp(12);
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		});

		const expectedResults = [
			{
				blockTimestamp: getTimestamp(0),
				canForge: true,
				currentForger: 0,
				height: 1,
				nextForger: 1,
				timestamp: getTimestamp(0),
			}, // + 8
			{
				blockTimestamp: getTimestamp(4),
				canForge: true,
				currentForger: 1,
				height: 2,
				nextForger: 2,
				timestamp: getTimestamp(4),
			},
			{
				blockTimestamp: getTimestamp(8),
				canForge: true,
				currentForger: 2,
				height: 3,
				nextForger: 3,
				timestamp: getTimestamp(8),
			},
			{
				blockTimestamp: getTimestamp(12),
				canForge: true,
				currentForger: 3,
				height: 4,
				nextForger: 0,
				timestamp: getTimestamp(12),
			},
			{
				blockTimestamp: getTimestamp(15),
				canForge: true,
				currentForger: 0,
				height: 5,
				nextForger: 1,
				timestamp: getTimestamp(15),
			},
			{
				blockTimestamp: getTimestamp(20),
				canForge: true,
				currentForger: 1,
				height: 6,
				nextForger: 2,
				timestamp: getTimestamp(20),
			},
			{
				blockTimestamp: getTimestamp(25),
				canForge: true,
				currentForger: 2,
				height: 7,
				nextForger: 3,
				timestamp: getTimestamp(25),
			},
			{
				blockTimestamp: getTimestamp(30),
				canForge: true,
				currentForger: 3,
				height: 8,
				nextForger: 4,
				timestamp: getTimestamp(30),
			},
			{
				blockTimestamp: getTimestamp(35),
				canForge: true,
				currentForger: 4,
				height: 9,
				nextForger: 0,
				timestamp: getTimestamp(35),
			},
			{
				blockTimestamp: getTimestamp(40),
				canForge: true,
				currentForger: 0,
				height: 10,
				nextForger: 1,
				timestamp: getTimestamp(40),
			},
		];

		const offTimeResults = [
			{
				blockTimestamp: getTimestamp(0),
				canForge: false,
				currentForger: 0,
				height: 1,
				nextForger: 1,
				timestamp: getTimestamp(3),
			},
			{
				blockTimestamp: getTimestamp(4),
				canForge: false,
				currentForger: 1,
				height: 2,
				nextForger: 2,
				timestamp: getTimestamp(7),
			},
			{
				blockTimestamp: getTimestamp(8),
				canForge: false,
				currentForger: 2,
				height: 3,
				nextForger: 3,
				timestamp: getTimestamp(11),
			},
			{
				blockTimestamp: getTimestamp(12),
				canForge: false,
				currentForger: 3,
				height: 4,
				nextForger: 0,
				timestamp: getTimestamp(14),
			},
			{
				blockTimestamp: getTimestamp(15),
				canForge: false,
				currentForger: 0,
				height: 5,
				nextForger: 1,
				timestamp: getTimestamp(19),
			},
			{
				blockTimestamp: getTimestamp(20),
				canForge: false,
				currentForger: 1,
				height: 6,
				nextForger: 2,
				timestamp: getTimestamp(24),
			},
			{
				blockTimestamp: getTimestamp(25),
				canForge: false,
				currentForger: 2,
				height: 7,
				nextForger: 3,
				timestamp: getTimestamp(29),
			},
			{
				blockTimestamp: getTimestamp(30),
				canForge: false,
				currentForger: 3,
				height: 8,
				nextForger: 4,
				timestamp: getTimestamp(34),
			},
			{
				blockTimestamp: getTimestamp(35),
				canForge: false,
				currentForger: 4,
				height: 9,
				nextForger: 0,
				timestamp: getTimestamp(39),
			},
			{
				blockTimestamp: getTimestamp(40),
				canForge: false,
				currentForger: 0,
				height: 10,
				nextForger: 1,
				timestamp: getTimestamp(44),
			},
		];

		const missedBlocks = [
			{
				blockTimestamp: getTimestamp(8),
				canForge: true,
				currentForger: 2,
				height: 2,
				nextForger: 3,
				timestamp: getTimestamp(8),
			},
			{
				blockTimestamp: getTimestamp(12),
				canForge: true,
				currentForger: 3,
				height: 2,
				nextForger: 0,
				timestamp: getTimestamp(12),
			},
			{
				blockTimestamp: getTimestamp(16),
				canForge: true,
				currentForger: 0,
				height: 2,
				nextForger: 1,
				timestamp: getTimestamp(16),
			},

			{
				blockTimestamp: getTimestamp(15),
				canForge: true,
				currentForger: 0,
				height: 4,
				nextForger: 1,
				timestamp: getTimestamp(15),
			},
			{
				blockTimestamp: getTimestamp(18),
				canForge: true,
				currentForger: 1,
				height: 4,
				nextForger: 2,
				timestamp: getTimestamp(18),
			},

			{
				blockTimestamp: getTimestamp(20),
				canForge: true,
				currentForger: 1,
				height: 5,
				nextForger: 2,
				timestamp: getTimestamp(20),
			},
			{
				blockTimestamp: getTimestamp(25),
				canForge: true,
				currentForger: 2,
				height: 5,
				nextForger: 3,
				timestamp: getTimestamp(25),
			},
			{
				blockTimestamp: getTimestamp(30),
				canForge: true,
				currentForger: 3,
				height: 5,
				nextForger: 4,
				timestamp: getTimestamp(30),
			},
			{
				blockTimestamp: getTimestamp(35),
				canForge: true,
				currentForger: 4,
				height: 5,
				nextForger: 0,
				timestamp: getTimestamp(35),
			},
		];

		for (const item of expectedResults.concat(offTimeResults).concat(missedBlocks)) {
			assert.equal(await calculateForgingInfo(item.timestamp, item.height, sandbox.app), {
				blockTimestamp: item.blockTimestamp,
				canForge: item.canForge,
				currentForger: item.currentForger,
				nextForger: item.nextForger,
			});
		}
	});
});
