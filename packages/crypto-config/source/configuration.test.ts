import cryptoJson from "../../core/bin/config/testnet/core/crypto.json";
import { describe } from "../../test-framework/source";
import { Configuration } from "./configuration";

describe<{
	configManager: Configuration;
}>("Configuration", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.configManager = new Configuration();

		context.configManager.setConfig(cryptoJson);
	});

	it("should be instantiated", ({ configManager }) => {
		assert.object(configManager);
	});

	it("should be set on runtime", ({ configManager }) => {
		configManager.setConfig(cryptoJson);

		assert.containKeys(configManager.all(), ["network", "milestones", "genesisBlock"]);
	});

	it('key should be "set"', ({ configManager }) => {
		configManager.set("key", "value");

		assert.equal(configManager.get("key"), "value");
	});

	it('key should be "get"', ({ configManager }) => {
		assert.equal(configManager.get("network.nethash"), cryptoJson.network.nethash);
	});

	it("should build milestones", ({ configManager }) => {
		assert.equal(configManager.getMilestones(), [
			{
				activeValidators: 0,
				address: { keccak256: true },
				block: { maxPayload: 2_097_152, maxTransactions: 150, version: 1 },
				blockTime: 8000,
				epoch: cryptoJson.milestones[0].epoch,
				fees: cryptoJson.milestones[0].fees,
				height: 0,
				multiPaymentLimit: 256,
				reward: "0",
				satoshi: { decimals: 8, denomination: 100_000_000 },
				stageTimeout: 2000,
				stageTimeoutIncrease: 2000,
				vendorFieldLength: 255,
			},
			{
				activeValidators: 53,
				address: { keccak256: true },
				block: { maxPayload: 2_097_152, maxTransactions: 150, version: 1 },
				blockTime: 8000,
				epoch: cryptoJson.milestones[0].epoch,
				fees: cryptoJson.milestones[0].fees,
				height: 1,
				multiPaymentLimit: 256,
				reward: "0",
				satoshi: { decimals: 8, denomination: 100_000_000 },
				stageTimeout: 2000,
				stageTimeoutIncrease: 2000,
				vendorFieldLength: 255,
			},
			{
				activeValidators: 53,
				address: { keccak256: true },
				block: { maxPayload: 2_097_152, maxTransactions: 150, version: 1 },
				blockTime: 8000,
				epoch: cryptoJson.milestones[0].epoch,
				fees: cryptoJson.milestones[0].fees,
				height: 75_600,
				multiPaymentLimit: 256,
				reward: "200000000",
				satoshi: { decimals: 8, denomination: 100_000_000 },
				stageTimeout: 2000,
				stageTimeoutIncrease: 2000,
				vendorFieldLength: 255,
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

	it("getNextMilestoneByKey - should throw an error if no milestones are set", ({ configManager }) => {
		configManager.setConfig({ ...cryptoJson, milestones: [] });
		assert.throws(
			() => configManager.getNextMilestoneWithNewKey(1, "vendorFieldLength"),
			`Attempted to get next milestone but none were set`,
		);
	});

	it("getNextMilestoneByKey - should throw an error if activeValidators is 0", ({ configManager }) => {
		assert.not.throws(() =>
			configManager.setConfig({
				...cryptoJson,
				milestones: [
					{
						height: 0,
						activeValidators: 0,
					},
				],
			}),
		);

		assert.throws(
			() =>
				configManager.setConfig({
					...cryptoJson,
					milestones: [
						{
							height: 1,
							activeValidators: 0,
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
							height: 0,
							activeValidators: 1,
						},
						{
							height: 15,
							activeValidators: 0,
						},
					],
				}),
			`Bad milestone at height: 15. The number of validators must be greater than 0.`,
		);
	});

	it("getNextMilestoneByKey - should get the next milestone with a given key", ({ configManager }) => {
		// configManager.setConfig(devnet);
		const expected = {
			data: "200000000",
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
		assert.equal(configManager.getNextMilestoneWithNewKey(1_750_000, "vendorFieldLength"), expected);
	});

	it("getNextMilestoneByKey - should get all milestones", ({ configManager }) => {
		const milestones = [
			{ height: 1, reward: "8" },
			{ height: 3, reward: "9" },
			{ height: 6, reward: "10" },
			{ height: 8, reward: "8" },
		];
		const config = { ...cryptoJson, milestones };
		configManager.setConfig(config);
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

	it("getMaxActiveValidators - should return maximum active validators from all milestones", ({ configManager }) => {
		configManager.setConfig({
			...cryptoJson,
			milestones: [{ height: 1, activeValidators: 1 }],
		});

		assert.equal(configManager.getMaxActiveValidators(), 1);

		configManager.setConfig({
			...cryptoJson,
			milestones: [
				{ height: 1, activeValidators: 1 },
				{ height: 3, activeValidators: 5 },
				{ height: 8, activeValidators: 2 },
			],
		});

		assert.equal(configManager.getMaxActiveValidators(), 5);

		configManager.setConfig({
			...cryptoJson,
			milestones: [
				{ height: 1, activeValidators: 5 },
				{ height: 6, activeValidators: 1 },
				{ height: 7, activeValidators: 10 },
			],
		});

		assert.equal(configManager.getMaxActiveValidators(), 10);

		configManager.setConfig({
			...cryptoJson,
			milestones: [
				{ height: 1, activeValidators: 5 },
				{ height: 6, activeValidators: 1 },
				{ height: 7, activeValidators: 1 },
			],
		});

		assert.equal(configManager.getMaxActiveValidators(), 5);

		configManager.setConfig({
			...cryptoJson,
			milestones: [{ height: 7, activeValidators: 1 }],
		});

		assert.equal(configManager.getMaxActiveValidators(), 1);
	});
});
