import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { describe } from "@mainsail/test-runner";
import { Application } from "@mainsail/kernel";
import { Configuration } from "./configuration";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";

import { schemas } from "./schemas.js";

describe<{
	app: Application;
	configManager: Configuration;
}>("Configuration", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		context.app = new Application();

		await context.app.resolve(ValidationServiceProvider).register();

		const validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
		for (const schema of Object.values(schemas)) {
			validator.addSchema(schema);
		}

		context.configManager = context.app.resolve(Configuration);
		context.configManager.setConfig(cryptoJson);
	});

	it("should be instantiated", ({ configManager }) => {
		assert.object(configManager);
	});

	it("should be set on runtime", ({ configManager }) => {
		configManager.setConfig(cryptoJson);

		assert.containKeys(configManager.all(), ["network", "milestones", "genesisBlock"]);
	});

	it("should throw on set before config is initialized", () => {
		const fresh = new Configuration();

		assert.throws(() => fresh.set("network.nethash", "dummy"));
	});

	it('key should be "set" if it is on config object property', ({ configManager }) => {
		configManager.set("network.key", "value");
		assert.equal(configManager.get("network.key"), "value");
	});

	it('key should not be "set" if it is not on config property', ({ configManager }) => {
		configManager.set("key", "value");
		assert.undefined(configManager.get("key"));
	});

	it('key should be "get"', ({ configManager }) => {
		assert.equal(configManager.get("network.nethash"), cryptoJson.network.nethash);
	});

	it("should build milestones", ({ configManager }) => {
		assert.equal(configManager.getMilestones(), [
			{
				roundValidators: 0,
				block: { maxPayload: 2_097_152, maxGasLimit: 10_000_000, version: 1 },
				gas: cryptoJson.milestones[0].gas,
				epoch: cryptoJson.milestones[0].epoch,
				evmSpec: cryptoJson.milestones[0].evmSpec,
				height: 0,
				reward: "0",
				satoshi: { decimals: 18, denomination: 1e18 },
				timeouts: {
					blockPrepareTime: 4000,
					blockTime: 8000,
					stageTimeout: 2000,
					stageTimeoutIncrease: 2000,
					tolerance: 100,
				},
				validatorRegistrationFee: "250000000000000000000",
			},
			{
				roundValidators: 53,
				block: { maxPayload: 2_097_152, maxGasLimit: 10_000_000, version: 1 },
				gas: cryptoJson.milestones[0].gas,
				epoch: cryptoJson.milestones[0].epoch,
				evmSpec: cryptoJson.milestones[0].evmSpec,
				height: 1,
				reward: "0",
				satoshi: { decimals: 18, denomination: 1e18 },
				timeouts: {
					blockPrepareTime: 4000,
					blockTime: 8000,
					stageTimeout: 2000,
					stageTimeoutIncrease: 2000,
					tolerance: 100,
				},
				validatorRegistrationFee: "250000000000000000000",
			},
			{
				roundValidators: 53,
				block: { maxPayload: 2_097_152, maxGasLimit: 10_000_000, version: 1 },
				gas: cryptoJson.milestones[0].gas,
				epoch: cryptoJson.milestones[0].epoch,
				evmSpec: cryptoJson.milestones[0].evmSpec,
				height: 75_600,
				reward: "2000000000000000000",
				satoshi: { decimals: 18, denomination: 1e18 },
				timeouts: {
					blockPrepareTime: 4000,
					blockTime: 8000,
					stageTimeout: 2000,
					stageTimeoutIncrease: 2000,
					tolerance: 100,
				},
				validatorRegistrationFee: "250000000000000000000",
			},
		]);
	});

	it("should get milestone for height", ({ configManager }) => {
		assert.equal(configManager.getMilestone(0).reward, cryptoJson.milestones[0].reward);
		assert.equal(configManager.getMilestone(75_600).reward, cryptoJson.milestones[2].reward);
	});

	it("should get milestone for this.height if height is not provided as parameter", ({ configManager }) => {
		assert.equal(configManager.getMilestone().reward, cryptoJson.milestones[0].reward);

		configManager.setHeight(75_600);

		assert.equal(configManager.getMilestone().reward, cryptoJson.milestones[2].reward);
	});

	it("should set the height", ({ configManager }) => {
		configManager.setHeight(21_600);

		assert.equal(configManager.getHeight(), 21_600);
	});

	it("should determine if a new milestone is becoming active", ({ configManager }) => {
		for (const milestone of cryptoJson.milestones) {
			configManager.setHeight(milestone.height);
			assert.true(configManager.isNewMilestone());
		}

		configManager.setHeight(999_999);
		assert.false(configManager.isNewMilestone());

		configManager.setHeight(1);
		assert.false(configManager.isNewMilestone(999_999));
	});

	it("should throw in isNewMilestone when milestones are not initialized", ({ configManager }) => {
		const fresh = new Configuration();
		assert.throws(() => fresh.isNewMilestone());
	});

	it("should throw in getMilestone when milestones are not initialized", ({ configManager }) => {
		const fresh = new Configuration();
		assert.throws(() => fresh.getMilestone());
	});

	it("should walk milestone index backwards when height decreases", ({ configManager }) => {
		configManager.setConfig(
			{
				...cryptoJson,
				milestones: [
					{ height: 0, roundValidators: 53, reward: "0" },
					{ height: 10, roundValidators: 53, reward: "1" },
					{ height: 20, roundValidators: 53, reward: "2" },
				],
			},
			false,
		);

		assert.equal(configManager.getMilestone(15).reward, "1");
		assert.equal(configManager.getMilestone(5).reward, "0");
	});

	it("getNextMilestoneByKey - should throw an error if configuration is not set", ({}) => {
		const configManager = new Configuration();
		assert.throws(() => configManager.getNextMilestoneWithNewKey(1, "evmSpec"));
	});

	it("getNextMilestoneByKey - should throw an error if roundValidators is 0", ({ configManager }) => {
		assert.not.throws(() =>
			configManager.setConfig(
				{
					...cryptoJson,
					milestones: [
						{
							roundValidators: 0,
							height: 0,
						},
					],
				},
				false,
			),
		);

		assert.throws(
			() =>
				configManager.setConfig({
					...cryptoJson,
					milestones: [
						{
							roundValidators: 0,
							height: 1,
						},
					],
				}),
			`Bad milestone at height: 1. The number of validators must be greater than 0.`,
		);

		assert.throws(
			() =>
				configManager.setConfig({
					...cryptoJson,
					milestones: [
						{
							roundValidators: 1,
							height: 0,
						},
						{
							roundValidators: 0,
							height: 15,
						},
					],
				}),
			`Bad milestone at height: 15. The number of validators must be greater than 0.`,
		);
	});

	it("getNextMilestoneByKey - should get the next milestone with a given key", ({ configManager }) => {
		// configManager.setConfig(devnet);
		const expected = {
			data: "2000000000000000000",
			found: true,
			height: 75_600,
		};
		assert.equal(configManager.getNextMilestoneWithNewKey(1, "reward"), expected);
	});

	it("getNextMilestoneByKey - should return empty result if no next milestone is found", ({ configManager }) => {
		const expected = {
			data: null,
			found: false,
			height: 1_750_000,
		};
		assert.equal(configManager.getNextMilestoneWithNewKey(1_750_000, "evmSpec"), expected);
	});

	it("getMilestoneDiff - should return empty diff when no original milestones are set", () => {
		const fresh = new Configuration();
		assert.equal(fresh.getMilestoneDiff(), {});
	});

	it("getMilestoneDiff - should return empty diff for first milestone", ({ configManager }) => {
		assert.equal(configManager.getMilestoneDiff(0), {});
	});

	it("getMilestoneDiff - should return diff for a later milestone", ({ configManager }) => {
		const diff = configManager.getMilestoneDiff(cryptoJson.milestones[1].height);
		assert.equal(diff.height, `${cryptoJson.milestones[0].height} => ${cryptoJson.milestones[1].height}`);
	});

	it("getMilestoneDiff - should use set height if height is not provided", ({ configManager }) => {
		configManager.setHeight(cryptoJson.milestones[1].height);
		const diff = configManager.getMilestoneDiff();
		assert.equal(diff.height, `${cryptoJson.milestones[0].height} => ${cryptoJson.milestones[1].height}`);
	});

	it("getNextMilestoneByKey - should get all milestones", ({ configManager }) => {
		const milestones = [
			{ height: 1, reward: "8" },
			{ height: 3, reward: "9" },
			{ height: 6, reward: "10" },
			{ height: 8, reward: "8" },
		];
		const config = { ...cryptoJson, milestones };
		configManager.setConfig(config, false);
		const secondMilestone = {
			data: "9",
			found: true,
			height: 3,
		};
		const thirdMilestone = {
			data: "10",
			found: true,
			height: 6,
		};
		const fourthMilestone = {
			data: "8",
			found: true,
			height: 8,
		};
		const emptyMilestone = {
			data: null,
			found: false,
			height: 8,
		};
		assert.equal(configManager.getNextMilestoneWithNewKey(1, "reward"), secondMilestone);
		assert.equal(configManager.getNextMilestoneWithNewKey(3, "reward"), thirdMilestone);
		assert.equal(configManager.getNextMilestoneWithNewKey(4, "reward"), thirdMilestone);
		assert.equal(configManager.getNextMilestoneWithNewKey(6, "reward"), fourthMilestone);
		assert.equal(configManager.getNextMilestoneWithNewKey(8, "reward"), emptyMilestone);
	});

	it("should return genesis height", ({ configManager }) => {
		assert.equal(configManager.getGenesisHeight(), cryptoJson.genesisBlock.block.number);
	});

	it("getMilestones - should throw when milestones are not initialized", () => {
		const fresh = new Configuration();
		assert.throws(() => fresh.getMilestones());
	});

	it("should throw if round validators change mid-round", ({ configManager }) => {
		assert.throws(
			() =>
				configManager.setConfig({
					...cryptoJson,
					milestones: [
						{ height: 1, roundValidators: 53 },
						{ height: 2, roundValidators: 54 },
					],
				}),
			"Bad milestone at height: 2. The number of validators can only be changed at the beginning of a new round.",
		);
	});

	it("getMaxRoundValidators - should return maximum round validators from all milestones", ({ configManager }) => {
		configManager.setConfig(
			{
				...cryptoJson,
				milestones: [{ roundValidators: 1, height: 1 }],
			},
			false,
		);

		assert.equal(configManager.getMaxRoundValidators(), 1);

		configManager.setConfig(
			{
				...cryptoJson,
				milestones: [
					{ roundValidators: 1, height: 1 },
					{ roundValidators: 5, height: 3 },
					{ roundValidators: 2, height: 8 },
				],
			},
			false,
		);

		assert.equal(configManager.getMaxRoundValidators(), 5);

		configManager.setConfig(
			{
				...cryptoJson,
				milestones: [
					{ roundValidators: 5, height: 1 },
					{ roundValidators: 1, height: 6 },
					{ roundValidators: 10, height: 7 },
				],
			},
			false,
		);

		assert.equal(configManager.getMaxRoundValidators(), 10);

		configManager.setConfig(
			{
				...cryptoJson,
				milestones: [
					{ roundValidators: 5, height: 1 },
					{ roundValidators: 1, height: 6 },
					{ roundValidators: 1, height: 7 },
				],
			},
			false,
		);

		assert.equal(configManager.getMaxRoundValidators(), 5);

		configManager.setConfig(
			{
				...cryptoJson,
				milestones: [{ roundValidators: 1, height: 7 }],
			},
			false,
		);

		assert.equal(configManager.getMaxRoundValidators(), 1);
	});
});
