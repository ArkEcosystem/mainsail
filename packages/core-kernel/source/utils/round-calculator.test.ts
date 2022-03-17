import { Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";

import crypto from "../../../core/bin/config/testnet/crypto.json";
import { describe, Sandbox } from "../../../core-test-framework";
import { calculateRound, isNewRound } from "./round-calculator";

type Context = {
	configuration: Configuration;
};

const setup = (context: Context) => {
	const sandbox = new Sandbox();

	sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

	context.configuration = sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration);

	context.configuration.setConfig(crypto);
};

describe<Context>("Round Calculator - calculateRound", ({ assert, beforeEach, it }) => {
	beforeEach(setup);

	it("static delegate count - should calculate the round when nextRound is the same", ({ configuration }) => {
		for (let index = 0, height = 51; index < 1000; index++, height += 51) {
			const { round, nextRound } = calculateRound(height - 1, configuration);
			assert.is(round, index + 1);
			assert.is(nextRound, index + 1);
		}
	});

	it("static delegate count - should calculate the round when nextRound is not the same", ({ configuration }) => {
		for (let index = 0, height = 51; index < 1000; index++, height += 51) {
			const { round, nextRound } = calculateRound(height, configuration);
			assert.is(round, index + 1);
			assert.is(nextRound, index + 2);
		}
	});

	it("static delegate count - should calculate the correct round", ({ configuration }) => {
		const activeDelegates = 51;
		for (let index = 0; index < 1000; index++) {
			const { round, nextRound } = calculateRound(index + 1, configuration);
			assert.is(round, Math.floor(index / activeDelegates) + 1);
			assert.is(nextRound, Math.floor((index + 1) / activeDelegates) + 1);
		}
	});

	it("static delegate count - should calculate correct round for each height in round", ({ configuration }) => {
		const milestones = [{ activeValidators: 4, height: 1 }];

		const config = { ...crypto, milestones };
		configuration.setConfig(config);

		const testVector = [
			// Round 1
			{ activeValidators: 4, height: 1, nextRound: 1, round: 1, roundHeight: 1 },
			{ activeValidators: 4, height: 2, nextRound: 1, round: 1, roundHeight: 1 },
			{ activeValidators: 4, height: 3, nextRound: 1, round: 1, roundHeight: 1 },
			{ activeValidators: 4, height: 4, nextRound: 2, round: 1, roundHeight: 1 },
			// Round 2
			{ activeValidators: 4, height: 5, nextRound: 2, round: 2, roundHeight: 5 },
			{ activeValidators: 4, height: 6, nextRound: 2, round: 2, roundHeight: 5 },
			{ activeValidators: 4, height: 7, nextRound: 2, round: 2, roundHeight: 5 },
			{ activeValidators: 4, height: 8, nextRound: 3, round: 2, roundHeight: 5 },
			// Round 3
			{ activeValidators: 4, height: 9, nextRound: 3, round: 3, roundHeight: 9 },
			{ activeValidators: 4, height: 10, nextRound: 3, round: 3, roundHeight: 9 },
			{ activeValidators: 4, height: 11, nextRound: 3, round: 3, roundHeight: 9 },
			{ activeValidators: 4, height: 12, nextRound: 4, round: 3, roundHeight: 9 },
		];

		for (const item of testVector) {
			const result = calculateRound(item.height, configuration);
			assert.is(result.round, item.round);
			assert.is(result.roundHeight, item.roundHeight);
			assert.true(isNewRound(result.roundHeight, configuration));
			assert.is(result.nextRound, item.nextRound);
			assert.is(result.maxValidators, item.activeValidators);
		}
	});

	it("dynamic delegate count - should calculate the correct with dynamic delegate count", ({ configuration }) => {
		const milestones = [
			{ activeValidators: 2, height: 1 },
			{ activeValidators: 3, height: 3 },
			{ activeValidators: 1, height: 9 },
			{ activeValidators: 3, height: 12 },
		];

		const config = { ...crypto, milestones };
		configuration.setConfig(config);

		const testVector = [
			// Round 1 - milestone
			{ activeValidators: 2, height: 1, nextRound: 1, round: 1, roundHeight: 1 },
			{ activeValidators: 2, height: 2, nextRound: 2, round: 1, roundHeight: 1 },
			// Round 2 - milestone change
			{ activeValidators: 3, height: 3, nextRound: 2, round: 2, roundHeight: 3 },
			{ activeValidators: 3, height: 4, nextRound: 2, round: 2, roundHeight: 3 },
			{ activeValidators: 3, height: 5, nextRound: 3, round: 2, roundHeight: 3 },
			// Round 3
			{ activeValidators: 3, height: 6, nextRound: 3, round: 3, roundHeight: 6 },
			{ activeValidators: 3, height: 7, nextRound: 3, round: 3, roundHeight: 6 },
			{ activeValidators: 3, height: 8, nextRound: 4, round: 3, roundHeight: 6 },
			// Round 4 - 6 - milestone change
			{ activeValidators: 1, height: 9, nextRound: 5, round: 4, roundHeight: 9 },
			{ activeValidators: 1, height: 10, nextRound: 6, round: 5, roundHeight: 10 },
			{ activeValidators: 1, height: 11, nextRound: 7, round: 6, roundHeight: 11 },
			// Round 7 - milestone change
			{ activeValidators: 3, height: 12, nextRound: 7, round: 7, roundHeight: 12 },
			{ activeValidators: 3, height: 13, nextRound: 7, round: 7, roundHeight: 12 },
			{ activeValidators: 3, height: 14, nextRound: 8, round: 7, roundHeight: 12 },
			// Round 8
			{ activeValidators: 3, height: 15, nextRound: 8, round: 8, roundHeight: 15 },
		];

		for (const { height, round, roundHeight, nextRound, activeValidators } of testVector) {
			const result = calculateRound(height, configuration);
			assert.is(result.round, round);
			assert.is(result.roundHeight, roundHeight);
			assert.true(isNewRound(result.roundHeight, configuration));
			assert.is(result.nextRound, nextRound);
			assert.is(result.maxValidators, activeValidators);
		}
	});

	it("dynamic delegate count - should throw if active delegates is not changed on new round", ({ configuration }) => {
		const milestones = [
			{ activeValidators: 3, height: 1 },
			// { activeValidators: 4, height: 3 }, // Next milestone should be 4
		];

		const config = { ...crypto, milestones };
		configuration.setConfig(config);

		milestones.push({ activeValidators: 4, height: 3 }); // Next milestone should be 4

		calculateRound(1, configuration);
		calculateRound(2, configuration);
		assert.throws(
			() => calculateRound(3, configuration),
			new Exceptions.InvalidMilestoneConfigurationError(
				"Bad milestone at height: 3. The number of validators can only be changed at the beginning of a new round.",
			),
		);
	});
});

describe<Context>("Round Calculator", ({ assert, beforeEach, it }) => {
	beforeEach(setup);

	it("should determine the beginning of a new round", ({ configuration }) => {
		assert.true(isNewRound(1, configuration));
		assert.false(isNewRound(2, configuration));
		assert.true(isNewRound(52, configuration));
		assert.false(isNewRound(53, configuration));
		assert.false(isNewRound(54, configuration));
		assert.true(isNewRound(103, configuration));
		assert.false(isNewRound(104, configuration));
		assert.true(isNewRound(154, configuration));
	});

	it("should be ok when changing delegate count", ({ configuration }) => {
		const milestones = [
			{ activeValidators: 2, height: 1 }, // R1
			{ activeValidators: 3, height: 3 }, // R2
			{ activeValidators: 1, height: 6 }, // R3
			{ activeValidators: 51, height: 10 }, // R7
			{ activeValidators: 51, height: 62 }, // R8
		];

		configuration.set("milestones", milestones);

		// 2 Delegates
		assert.true(isNewRound(1, configuration));
		assert.false(isNewRound(2, configuration));

		// 3 Delegates
		assert.true(isNewRound(3, configuration));
		assert.false(isNewRound(4, configuration));
		assert.false(isNewRound(5, configuration));

		// 1 Delegate
		assert.true(isNewRound(6, configuration));
		assert.true(isNewRound(7, configuration));
		assert.true(isNewRound(8, configuration));
		assert.true(isNewRound(9, configuration));

		// 51 Delegates
		assert.true(isNewRound(10, configuration));
		assert.false(isNewRound(11, configuration));
		assert.true(isNewRound(61, configuration));
	});
});
