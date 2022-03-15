import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";

import { describe, Sandbox } from "../../core-test-framework";
import milestones from "../test/fixtures/block-time-milestones.json";
import { BlockTimeCalculator } from "./block-time-calculator";

describe<{
	sanbox: Sandbox;
	configuration: Contracts.Crypto.IConfiguration;
	blockTimeCalculator: BlockTimeCalculator;
}>("BlockTimeCalculator", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.sanbox = new Sandbox();

		context.sanbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.configuration = context.sanbox.app.get<Configuration>(Identifiers.Cryptography.Configuration);

		context.configuration.set("milestones", milestones);

		context.blockTimeCalculator = context.sanbox.app.resolve(BlockTimeCalculator);
	});

	it("isNewBlock - should calculate whether a given round contains a new blocktime", ({ blockTimeCalculator }) => {
		assert.true(blockTimeCalculator.isNewBlockTime(1));
		assert.true(blockTimeCalculator.isNewBlockTime(10_800));
		assert.true(blockTimeCalculator.isNewBlockTime(910_000));
		assert.true(blockTimeCalculator.isNewBlockTime(920_000));
		assert.true(blockTimeCalculator.isNewBlockTime(950_000));
	});

	it("isNewBlock - should return false is the height is not a new milestone", ({ blockTimeCalculator }) => {
		assert.false(blockTimeCalculator.isNewBlockTime(2));
		assert.false(blockTimeCalculator.isNewBlockTime(10_799));
		assert.false(blockTimeCalculator.isNewBlockTime(10_801));
		assert.false(blockTimeCalculator.isNewBlockTime(960_001));
	});

	it("isNewBlock - should return false when a new milestone doesn't include a new blocktime", async ({
		blockTimeCalculator,
	}) => {
		assert.false(blockTimeCalculator.isNewBlockTime(21_600));
		assert.false(blockTimeCalculator.isNewBlockTime(960_000));
	});

	it("isNewBlock - should return false when the milestone includes the same blocktime", async ({
		blockTimeCalculator,
	}) => {
		assert.false(blockTimeCalculator.isNewBlockTime(910_004));
	});

	it("calculateBlockTime - should calculate the blocktime from a given height", ({ blockTimeCalculator }) => {
		assert.equal(blockTimeCalculator.calculateBlockTime(1), 8);
		assert.equal(blockTimeCalculator.calculateBlockTime(10_800), 9);
		assert.equal(blockTimeCalculator.calculateBlockTime(910_000), 11);

		assert.equal(blockTimeCalculator.calculateBlockTime(950_000), 12);
	});

	it("calculateBlockTime - should calculate blocktime from the last milestone where it was changes", ({
		blockTimeCalculator,
	}) => {
		assert.false(blockTimeCalculator.isNewBlockTime(21_600));
		assert.false(blockTimeCalculator.isNewBlockTime(900_000));
		assert.false(blockTimeCalculator.isNewBlockTime(2));
		assert.false(blockTimeCalculator.isNewBlockTime(10_799));
		assert.false(blockTimeCalculator.isNewBlockTime(970_000));

		assert.equal(blockTimeCalculator.calculateBlockTime(2), 8);
		assert.equal(blockTimeCalculator.calculateBlockTime(10_799), 8);

		assert.equal(blockTimeCalculator.calculateBlockTime(21_600), 9);
		assert.equal(blockTimeCalculator.calculateBlockTime(900_000), 9);
		assert.equal(blockTimeCalculator.calculateBlockTime(970_000), 12);
	});

	it("calculateBlockTime - should calculate blocktimes when they reduce to a previously used blocktime", ({
		blockTimeCalculator,
	}) => {
		assert.true(blockTimeCalculator.isNewBlockTime(920_000));

		assert.equal(blockTimeCalculator.calculateBlockTime(920_000), 9);
	});

	it("calculateBlockTime - should calculate latest milestone correctly when it doesn't change the blocktime", ({
		blockTimeCalculator,
	}) => {
		assert.false(blockTimeCalculator.isNewBlockTime(960_000));
		assert.equal(blockTimeCalculator.calculateBlockTime(960_000), 12);
	});

	it("calculateBlockTime - should throw an error when no blocktimes are specified in any milestones", ({
		blockTimeCalculator,
		configuration,
	}) => {
		configuration.set("milestones", {});

		assert.false(blockTimeCalculator.isNewBlockTime(960_000));
		assert.throws(
			() => blockTimeCalculator.calculateBlockTime(960_000),
			"No milestones specifying any height were found",
		);
	});
});
