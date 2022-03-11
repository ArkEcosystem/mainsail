import { calculateBlockTime, isNewBlockTime } from "./block-time-calculator";
import { describe } from "@arkecosystem/core-test-framework";
import { configManager } from "../managers/config";
import milestones from "../../test/fixtures/block-time-milestones.json";

describe<{
	config: any;
}>("BlockTimeCalculator", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach((context) => {
		context.config = configManager.get("milestones");

		configManager.set("milestones", milestones);
	});

	afterEach((context) => {
		configManager.set("milestones", context.config);
	});

	it("isNewBlock - should calculate whether a given round contains a new blocktime", () => {
		assert.true(isNewBlockTime(1));
		assert.true(isNewBlockTime(10800));
		assert.true(isNewBlockTime(910000));
		assert.true(isNewBlockTime(920000));
		assert.true(isNewBlockTime(950000));
	});

	it("isNewBlock - should return false is the height is not a new milestone", () => {
		assert.false(isNewBlockTime(2));
		assert.false(isNewBlockTime(10799));
		assert.false(isNewBlockTime(10801));
		assert.false(isNewBlockTime(960001));
	});

	it("isNewBlock - should return false when a new milestone doesn't include a new blocktime", async () => {
		assert.false(isNewBlockTime(21600));
		assert.false(isNewBlockTime(960000));
	});

	it("isNewBlock - should return false when the milestone includes the same blocktime", async () => {
		assert.false(isNewBlockTime(910004));
	});

	it("calculateBlockTime - should calculate the blocktime from a given height", () => {
		assert.equal(calculateBlockTime(1), 8);
		assert.equal(calculateBlockTime(10800), 9);
		assert.equal(calculateBlockTime(910000), 11);

		assert.equal(calculateBlockTime(950000), 12);
	});

	it("calculateBlockTime - should calculate blocktime from the last milestone where it was changes", () => {
		assert.false(isNewBlockTime(21600));
		assert.false(isNewBlockTime(900000));
		assert.false(isNewBlockTime(2));
		assert.false(isNewBlockTime(10799));
		assert.false(isNewBlockTime(970000));

		assert.equal(calculateBlockTime(2), 8);
		assert.equal(calculateBlockTime(10799), 8);

		assert.equal(calculateBlockTime(21600), 9);
		assert.equal(calculateBlockTime(900000), 9);
		assert.equal(calculateBlockTime(970000), 12);
	});

	it("calculateBlockTime - should calculate blocktimes when they reduce to a previously used blocktime", () => {
		assert.true(isNewBlockTime(920000));

		assert.equal(calculateBlockTime(920000), 9);
	});

	it("calculateBlockTime - should calculate latest milestone correctly when it doesn't change the blocktime", () => {
		assert.false(isNewBlockTime(960000));
		assert.equal(calculateBlockTime(960000), 12);
	});

	it("calculateBlockTime - should throw an error when no blocktimes are specified in any milestones", () => {
		configManager.set("milestones", {});

		assert.false(isNewBlockTime(960000));
		assert.throws(() => calculateBlockTime(960000), "No milestones specifying any height were found");
	});
});
