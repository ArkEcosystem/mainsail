import { Errors, Interfaces, Managers, Networks } from "@arkecosystem/crypto";

import { describe } from "../../../core-test-framework";
import { calculateRound, isNewRound } from "./round-calculator";

describe<{
	config: Interfaces.NetworkConfig;
}>("Round Calculator - calculateRound", ({ afterEach, assert, beforeEach, it, stub }) => {
	beforeEach((context) => {
		context.config = Managers.configManager.all();
	});

	afterEach((context) => {
		Managers.configManager.setConfig(context.config);
	});

	it("static delegate count - should calculate the round when nextRound is the same", () => {
		for (let index = 0, height = 51; index < 1000; index++, height += 51) {
			const { round, nextRound } = calculateRound(height - 1);
			assert.is(round, index + 1);
			assert.is(nextRound, index + 1);
		}
	});

	it("static delegate count - should calculate the round when nextRound is not the same", () => {
		for (let index = 0, height = 51; index < 1000; index++, height += 51) {
			const { round, nextRound } = calculateRound(height);
			assert.is(round, index + 1);
			assert.is(nextRound, index + 2);
		}
	});

	it("static delegate count - should calculate the correct round", () => {
		const activeDelegates = 51;
		for (let index = 0; index < 1000; index++) {
			const { round, nextRound } = calculateRound(index + 1);
			assert.is(round, Math.floor(index / activeDelegates) + 1);
			assert.is(nextRound, Math.floor((index + 1) / activeDelegates) + 1);
		}
	});

	it("static delegate count - should calculate correct round for each height in round", () => {
		const milestones = [{ activeDelegates: 4, height: 1 }];

		const config = { ...Networks.devnet, milestones };
		Managers.configManager.setConfig(config);

		const testVector = [
			// Round 1
			{ activeDelegates: 4, height: 1, nextRound: 1, round: 1, roundHeight: 1 },
			{ activeDelegates: 4, height: 2, nextRound: 1, round: 1, roundHeight: 1 },
			{ activeDelegates: 4, height: 3, nextRound: 1, round: 1, roundHeight: 1 },
			{ activeDelegates: 4, height: 4, nextRound: 2, round: 1, roundHeight: 1 },
			// Round 2
			{ activeDelegates: 4, height: 5, nextRound: 2, round: 2, roundHeight: 5 },
			{ activeDelegates: 4, height: 6, nextRound: 2, round: 2, roundHeight: 5 },
			{ activeDelegates: 4, height: 7, nextRound: 2, round: 2, roundHeight: 5 },
			{ activeDelegates: 4, height: 8, nextRound: 3, round: 2, roundHeight: 5 },
			// Round 3
			{ activeDelegates: 4, height: 9, nextRound: 3, round: 3, roundHeight: 9 },
			{ activeDelegates: 4, height: 10, nextRound: 3, round: 3, roundHeight: 9 },
			{ activeDelegates: 4, height: 11, nextRound: 3, round: 3, roundHeight: 9 },
			{ activeDelegates: 4, height: 12, nextRound: 4, round: 3, roundHeight: 9 },
		];

		for (const item of testVector) {
			const result = calculateRound(item.height);
			assert.is(result.round, item.round);
			assert.is(result.roundHeight, item.roundHeight);
			assert.true(isNewRound(result.roundHeight));
			assert.is(result.nextRound, item.nextRound);
			assert.is(result.maxDelegates, item.activeDelegates);
		}
	});

	it("dynamic delegate count - should calculate the correct with dynamic delegate count", () => {
		const milestones = [
			{ activeDelegates: 2, height: 1 },
			{ activeDelegates: 3, height: 3 },
			{ activeDelegates: 1, height: 9 },
			{ activeDelegates: 3, height: 12 },
		];

		const testVector = [
			// Round 1 - milestone
			{ activeDelegates: 2, height: 1, nextRound: 1, round: 1, roundHeight: 1 },
			{ activeDelegates: 2, height: 2, nextRound: 2, round: 1, roundHeight: 1 },
			// Round 2 - milestone change
			{ activeDelegates: 3, height: 3, nextRound: 2, round: 2, roundHeight: 3 },
			{ activeDelegates: 3, height: 4, nextRound: 2, round: 2, roundHeight: 3 },
			{ activeDelegates: 3, height: 5, nextRound: 3, round: 2, roundHeight: 3 },
			// Round 3
			{ activeDelegates: 3, height: 6, nextRound: 3, round: 3, roundHeight: 6 },
			{ activeDelegates: 3, height: 7, nextRound: 3, round: 3, roundHeight: 6 },
			{ activeDelegates: 3, height: 8, nextRound: 4, round: 3, roundHeight: 6 },
			// Round 4 - 6 - milestone change
			{ activeDelegates: 1, height: 9, nextRound: 5, round: 4, roundHeight: 9 },
			{ activeDelegates: 1, height: 10, nextRound: 6, round: 5, roundHeight: 10 },
			{ activeDelegates: 1, height: 11, nextRound: 7, round: 6, roundHeight: 11 },
			// Round 7 - milestone change
			{ activeDelegates: 3, height: 12, nextRound: 7, round: 7, roundHeight: 12 },
			{ activeDelegates: 3, height: 13, nextRound: 7, round: 7, roundHeight: 12 },
			{ activeDelegates: 3, height: 14, nextRound: 8, round: 7, roundHeight: 12 },
			// Round 8
			{ activeDelegates: 3, height: 15, nextRound: 8, round: 8, roundHeight: 15 },
		];

		const config = { ...Networks.devnet, milestones };
		Managers.configManager.setConfig(config);

		for (const { height, round, roundHeight, nextRound, activeDelegates } of testVector) {
			const result = calculateRound(height);
			assert.is(result.round, round);
			assert.is(result.roundHeight, roundHeight);
			assert.true(isNewRound(result.roundHeight));
			assert.is(result.nextRound, nextRound);
			assert.is(result.maxDelegates, activeDelegates);
		}
	});

	it("dynamic delegate count - should throw if active delegates is not changed on new round", () => {
		const milestones = [
			{ activeDelegates: 3, height: 1 },
			{ activeDelegates: 4, height: 3 }, // Next milestone should be 4
		];

		stub(Managers.configManager, "validateMilestones");

		const config = { ...Networks.devnet, milestones };
		Managers.configManager.setConfig(config);

		calculateRound(1);
		calculateRound(2);
		assert.rejects(() => calculateRound(3), Errors.InvalidMilestoneConfigurationError);
	});
});

describe<{
	config: Interfaces.NetworkConfig;
}>("Round Calculator", ({ afterEach, assert, beforeEach, it, stub }) => {
	beforeEach((context) => {
		context.config = Managers.configManager.all();
	});
	afterEach((context) => {
		Managers.configManager.setConfig(context.config);
	});
	it("should determine the beginning of a new round", () => {
		assert.true(isNewRound(1));
		assert.false(isNewRound(2));
		assert.true(isNewRound(52));
		assert.false(isNewRound(53));
		assert.false(isNewRound(54));
		assert.true(isNewRound(103));
		assert.false(isNewRound(104));
		assert.true(isNewRound(154));
	});

	it("should be ok when changing delegate count", () => {
		const milestones = [
			{ activeDelegates: 2, height: 1 }, // R1
			{ activeDelegates: 3, height: 3 }, // R2
			{ activeDelegates: 1, height: 6 }, // R3
			{ activeDelegates: 51, height: 10 }, // R7
			{ activeDelegates: 51, height: 62 }, // R8
		];

		Managers.configManager.set("milestones", milestones);

		stub(Managers.configManager, "getMilestone").callsFake((height) => {
			for (let index = milestones.length - 1; index >= 0; index--) {
				if (milestones[index].height <= height) {
					return milestones[index];
				}
			}
			return milestones[0];
		});

		// 2 Delegates
		assert.true(isNewRound(1));
		assert.false(isNewRound(2));

		// 3 Delegates
		assert.true(isNewRound(3));
		assert.false(isNewRound(4));
		assert.false(isNewRound(5));

		// 1 Delegate
		assert.true(isNewRound(6));
		assert.true(isNewRound(7));
		assert.true(isNewRound(8));
		assert.true(isNewRound(9));

		// 51 Delegates
		assert.true(isNewRound(10));
		assert.false(isNewRound(11));
		assert.true(isNewRound(61));
	});
});
