import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import * as Exceptions from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { RoundCalculator } from "./round-calculator";

type Context = {
	app: Application;
	configuration: Contracts.Crypto.Configuration;
	roundCalculator: RoundCalculator;
};

const setup = async (context: Context) => {
	context.app = new Application();
	context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
	await context.app.resolve(ValidationServiceProvider).register();
	await context.app.resolve(CryptoConfigServiceProvider).register();

	context.configuration = context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);

	context.roundCalculator = context.app.resolve<RoundCalculator>(RoundCalculator);
};

const withGenesis = (genesisHeight: number, milestones: object[]) => ({
	...cryptoJson,
	genesisBlock: { ...cryptoJson.genesisBlock, block: { ...cryptoJson.genesisBlock.block, number: genesisHeight } },
	milestones,
});

describe<Context>("Round Calculator - calculateRound", ({ assert, beforeEach, it }) => {
	beforeEach(setup);

	it("static delegate count - should calculate the round when nextRound is the same", ({
		configuration,
		roundCalculator,
	}) => {
		const { roundValidators } = configuration.getMilestone(1);

		for (let index = 0, height = roundValidators; index < 1000; index++, height += roundValidators) {
			const { round, nextRound } = roundCalculator.calculateRound(height - 1);
			assert.is(round, index + 1);
			assert.is(nextRound, index + 1);
		}
	});

	it("static delegate count - should calculate the round when nextRound is not the same", ({
		configuration,
		roundCalculator,
	}) => {
		const { roundValidators } = configuration.getMilestone(1);

		for (let index = 0, height = roundValidators; index < 1000; index++, height += roundValidators) {
			const { round, nextRound } = roundCalculator.calculateRound(height);
			assert.is(round, index + 1);
			assert.is(nextRound, index + 2);
		}
	});

	it("static delegate count - should calculate the correct round", ({ configuration, roundCalculator }) => {
		const { roundValidators } = configuration.getMilestone(1);

		for (let index = 0; index < 1000; index++) {
			const { round, nextRound } = roundCalculator.calculateRound(index + 1);
			assert.is(round, Math.floor(index / roundValidators) + 1);
			assert.is(nextRound, Math.floor((index + 1) / roundValidators) + 1);
		}
	});

	it("static delegate count - should calculate correct round for each height in round", ({
		configuration,
		roundCalculator,
	}) => {
		const milestones = [{ roundValidators: 4, height: 0 }];

		const config = { ...cryptoJson, milestones };
		configuration.setConfig(config, false);

		const testVector = [
			// Round 0
			{ roundValidators: 0, height: 0, nextRound: 1, round: 0, roundHeight: 0 },
			// Round 1
			{ roundValidators: 4, height: 1, nextRound: 1, round: 1, roundHeight: 1 },
			{ roundValidators: 4, height: 2, nextRound: 1, round: 1, roundHeight: 1 },
			{ roundValidators: 4, height: 3, nextRound: 1, round: 1, roundHeight: 1 },
			{ roundValidators: 4, height: 4, nextRound: 2, round: 1, roundHeight: 1 },
			// Round 2
			{ roundValidators: 4, height: 5, nextRound: 2, round: 2, roundHeight: 5 },
			{ roundValidators: 4, height: 6, nextRound: 2, round: 2, roundHeight: 5 },
			{ roundValidators: 4, height: 7, nextRound: 2, round: 2, roundHeight: 5 },
			{ roundValidators: 4, height: 8, nextRound: 3, round: 2, roundHeight: 5 },
			// Round 3
			{ roundValidators: 4, height: 9, nextRound: 3, round: 3, roundHeight: 9 },
			{ roundValidators: 4, height: 10, nextRound: 3, round: 3, roundHeight: 9 },
			{ roundValidators: 4, height: 11, nextRound: 3, round: 3, roundHeight: 9 },
			{ roundValidators: 4, height: 12, nextRound: 4, round: 3, roundHeight: 9 },
		];

		for (const item of testVector) {
			const result = roundCalculator.calculateRound(item.height);
			assert.is(result.round, item.round);
			assert.is(result.roundHeight, item.roundHeight);
			assert.true(roundCalculator.isNewRound(result.roundHeight));
			assert.is(result.nextRound, item.nextRound);
			assert.is(result.maxValidators, item.roundValidators);
		}
	});

	it("dynamic delegate count - should calculate the correct with dynamic delegate count", ({
		configuration,
		roundCalculator,
	}) => {
		const milestones = [
			{ roundValidators: 2, height: 0 },
			{ roundValidators: 3, height: 3 },
			{ roundValidators: 1, height: 9 },
			{ roundValidators: 3, height: 12 },
		];

		const config = { ...cryptoJson, milestones };
		configuration.setConfig(config, false);

		const testVector = [
			// Round 0 - milestone
			{ roundValidators: 0, height: 0, nextRound: 1, round: 0, roundHeight: 0 },
			// Round 1 - milestone
			{ roundValidators: 2, height: 1, nextRound: 1, round: 1, roundHeight: 1 },
			{ roundValidators: 2, height: 2, nextRound: 2, round: 1, roundHeight: 1 },
			// Round 2 - milestone change
			{ roundValidators: 3, height: 3, nextRound: 2, round: 2, roundHeight: 3 },
			{ roundValidators: 3, height: 4, nextRound: 2, round: 2, roundHeight: 3 },
			{ roundValidators: 3, height: 5, nextRound: 3, round: 2, roundHeight: 3 },
			// Round 3
			{ roundValidators: 3, height: 6, nextRound: 3, round: 3, roundHeight: 6 },
			{ roundValidators: 3, height: 7, nextRound: 3, round: 3, roundHeight: 6 },
			{ roundValidators: 3, height: 8, nextRound: 4, round: 3, roundHeight: 6 },
			// Round 4 - 6 - milestone change
			{ roundValidators: 1, height: 9, nextRound: 5, round: 4, roundHeight: 9 },
			{ roundValidators: 1, height: 10, nextRound: 6, round: 5, roundHeight: 10 },
			{ roundValidators: 1, height: 11, nextRound: 7, round: 6, roundHeight: 11 },
			// Round 7 - milestone change
			{ roundValidators: 3, height: 12, nextRound: 7, round: 7, roundHeight: 12 },
			{ roundValidators: 3, height: 13, nextRound: 7, round: 7, roundHeight: 12 },
			{ roundValidators: 3, height: 14, nextRound: 8, round: 7, roundHeight: 12 },
			// Round 8
			{ roundValidators: 3, height: 15, nextRound: 8, round: 8, roundHeight: 15 },
		];

		for (const { height, round, roundHeight, nextRound, roundValidators } of testVector) {
			const result = roundCalculator.calculateRound(height);
			assert.is(result.round, round);
			assert.is(result.roundHeight, roundHeight);
			assert.true(roundCalculator.isNewRound(result.roundHeight));
			assert.is(result.nextRound, nextRound);
			assert.is(result.maxValidators, roundValidators);
		}
	});

	it("dynamic delegate count - should calculate the correct with dynamic delegate count (2)", ({
		configuration,
		roundCalculator,
	}) => {
		const milestones = [
			{ roundValidators: 3, height: 0 },
			{ roundValidators: 7, height: 4 },
			{ roundValidators: 4, height: 11 },
			{ roundValidators: 53, height: 15 },
		];

		const config = { ...cryptoJson, milestones };
		configuration.setConfig(config, false);

		const testVector = [
			// Round 0
			{ roundValidators: 0, height: 0, nextRound: 1, round: 0, roundHeight: 0 },
			// Round 1
			{ roundValidators: 3, height: 1, nextRound: 1, round: 1, roundHeight: 1 },
			{ roundValidators: 3, height: 2, nextRound: 1, round: 1, roundHeight: 1 },
			{ roundValidators: 3, height: 3, nextRound: 2, round: 1, roundHeight: 1 },
			// Round 2
			{ roundValidators: 7, height: 4, nextRound: 2, round: 2, roundHeight: 4 },
			{ roundValidators: 7, height: 10, nextRound: 3, round: 2, roundHeight: 4 },
			// Round 3
			{ roundValidators: 4, height: 11, nextRound: 3, round: 3, roundHeight: 11 },
			{ roundValidators: 4, height: 14, nextRound: 4, round: 3, roundHeight: 11 },
			{ roundValidators: 53, height: 15, nextRound: 4, round: 4, roundHeight: 15 },
			{ roundValidators: 53, height: 67, nextRound: 5, round: 4, roundHeight: 15 },
			// Round 4
			{ roundValidators: 53, height: 68, nextRound: 5, round: 5, roundHeight: 68 },
		];

		for (const { height, round, roundHeight, nextRound, roundValidators } of testVector) {
			configuration.setHeight(height);

			const result = roundCalculator.calculateRound(height);

			assert.is(result.round, round);
			assert.is(result.roundHeight, roundHeight);
			assert.true(roundCalculator.isNewRound(result.roundHeight));
			assert.is(result.nextRound, nextRound);
			assert.is(result.maxValidators, roundValidators);
		}
	});

	it("should not depend on milestones that leave the validator count unchanged", ({
		configuration,
		roundCalculator,
	}) => {
		const milestones = [
			{ roundValidators: 0, height: 0 },
			{ roundValidators: 53, height: 1 },
			{ height: 75_600, reward: "1" },
			{ height: 100_000, reward: "2" },
		];

		configuration.setConfig({ ...cryptoJson, milestones }, false);

		for (const height of [1, 54, 75_600, 100_000, 100_001]) {
			const result = roundCalculator.calculateRound(height);
			assert.is(result.round, Math.floor((height - 1) / 53) + 1);
			assert.is(result.roundHeight, 1 + (result.round - 1) * 53);
			assert.is(result.maxValidators, 53);
		}
	});

	it("should count rounds from the block after a non-zero genesis", ({ configuration, roundCalculator }) => {
		const genesisHeight = 1000;

		// Snapshot-like: the validator count is introduced right after genesis
		configuration.setConfig(
			withGenesis(genesisHeight, [
				{ roundValidators: 0, height: genesisHeight },
				{ roundValidators: 53, height: genesisHeight + 1 },
			]),
			false,
		);

		assert.equal(roundCalculator.calculateRound(genesisHeight), {
			maxValidators: 0,
			nextRound: 1,
			round: 0,
			roundHeight: genesisHeight,
		});
		assert.equal(roundCalculator.calculateRound(genesisHeight + 1), {
			maxValidators: 53,
			nextRound: 1,
			round: 1,
			roundHeight: genesisHeight + 1,
		});
		assert.equal(roundCalculator.calculateRound(genesisHeight + 53), {
			maxValidators: 53,
			nextRound: 2,
			round: 1,
			roundHeight: genesisHeight + 1,
		});
		assert.equal(roundCalculator.calculateRound(genesisHeight + 54), {
			maxValidators: 53,
			nextRound: 2,
			round: 2,
			roundHeight: genesisHeight + 54,
		});
	});

	it("should reject heights below the genesis height", ({ configuration, roundCalculator }) => {
		configuration.setConfig(
			withGenesis(1000, [
				{ roundValidators: 0, height: 1000 },
				{ roundValidators: 53, height: 1001 },
			]),
			false,
		);

		assert.throws(() => roundCalculator.calculateRound(999), "Height 999 is below the genesis height 1000");
		assert.throws(() => roundCalculator.isNewRound(999), "Height 999 is below the genesis height 1000");
	});
});

describe<Context>("Round Calculator - isNewRound", ({ assert, beforeEach, it }) => {
	beforeEach(setup);

	it("should determine the beginning of a new round", ({ roundCalculator }) => {
		assert.true(roundCalculator.isNewRound(0));
		assert.true(roundCalculator.isNewRound(1));
		assert.false(roundCalculator.isNewRound(2));
		assert.false(roundCalculator.isNewRound(52));
		assert.false(roundCalculator.isNewRound(53));
		assert.true(roundCalculator.isNewRound(54));
		assert.false(roundCalculator.isNewRound(103));
		assert.true(roundCalculator.isNewRound(107));
		assert.false(roundCalculator.isNewRound(159));
	});

	it("should be ok when changing delegate count", ({ configuration, roundCalculator }) => {
		const milestones = [
			{ roundValidators: 1, height: 0 }, // R0
			{ roundValidators: 2, height: 1 }, // R1
			{ roundValidators: 3, height: 3 }, // R2
			{ roundValidators: 1, height: 6 }, // R3
			{ roundValidators: 53, height: 10 }, // R7
			{ roundValidators: 53, height: 62 }, // R8
		];

		configuration.setConfig(
			{
				...cryptoJson,
				milestones,
			},
			false,
		);

		// 1 Delegate
		assert.true(roundCalculator.isNewRound(0));

		// 2 Delegates
		assert.true(roundCalculator.isNewRound(1));
		assert.false(roundCalculator.isNewRound(2));

		// 3 Delegates
		assert.true(roundCalculator.isNewRound(3));
		assert.false(roundCalculator.isNewRound(4));
		assert.false(roundCalculator.isNewRound(5));

		// 1 Delegate
		assert.true(roundCalculator.isNewRound(6));
		assert.true(roundCalculator.isNewRound(7));
		assert.true(roundCalculator.isNewRound(8));
		assert.true(roundCalculator.isNewRound(9));

		// 53 Delegates
		assert.true(roundCalculator.isNewRound(10));
		assert.false(roundCalculator.isNewRound(11));
		assert.true(roundCalculator.isNewRound(63));
	});
});

describe<{
	app: Application;
	roundCalculator: RoundCalculator;
}>("Round Calculator - misaligned milestones", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		// A real Configuration rejects such milestones in setConfig, so a stub has to hand them over.
		// Rounds of 3 start at 1, 4, 7: a change at height 5 falls in the middle of a round.
		const milestones = [
			{ height: 0, roundValidators: 0 },
			{ height: 1, roundValidators: 3 },
			{ height: 5, roundValidators: 4 },
		];

		const configuration = {
			getGenesisHeight: () => 0,
			getMilestone: (height: number) => [...milestones].reverse().find((milestone) => milestone.height <= height),
			getNextMilestoneWithNewKey: (previousHeight: number) => {
				const next = milestones.find((milestone) => milestone.height > previousHeight);

				return next
					? { data: next.roundValidators, found: true, height: next.height }
					: { data: null, found: false, height: previousHeight };
			},
		};

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(configuration);

		context.roundCalculator = context.app.resolve(RoundCalculator);
	});

	it("should throw if the validator count changes in the middle of a round", ({ roundCalculator }) => {
		const expectedError = new Exceptions.InvalidMilestoneConfigurationError(
			"Bad milestone at height: 5. The number of validators can only be changed at the beginning of a new round.",
		);

		assert.throws(() => roundCalculator.calculateRound(5), expectedError);
		assert.throws(() => roundCalculator.isNewRound(5), expectedError);
	});
});
