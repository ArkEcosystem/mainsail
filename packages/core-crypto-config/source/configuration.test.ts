import { describe } from "../../core-test-framework";
import { devnet, mainnet } from "../networks";
import { configManager } from ".";

describe<{
	config: any;
}>("Configuration", ({ it, beforeEach, afterEach, assert }) => {
	beforeEach((context) => {
		context.config = configManager.all();

		configManager.setConfig(devnet);
	});

	afterEach((context) => configManager.setConfig(context.config));

	it("should be instantiated", () => {
		assert.object(configManager);
	});

	it("should be set on runtime", () => {
		configManager.setConfig(mainnet);

		assert.containKeys(configManager.all(), ["network", "milestones", "exceptions", "genesisBlock"]);
	});

	it('key should be "set"', () => {
		configManager.set("key", "value");

		assert.equal(configManager.get("key"), "value");
	});

	it('key should be "get"', () => {
		assert.equal(
			configManager.get("network.nethash"),
			"2a44f340d76ffc3df204c5f38cd355b7496c9065a1ade2ef92071436bd72e867",
		);
	});

	it("should build milestones", () => {
		assert.equal(configManager.getMilestones(), devnet.milestones);
	});

	it('should build milestones without concatenating the "minimumVersions" array', () => {
		const milestones = devnet.milestones.sort((a, b) => a.height - b.height);
		configManager.setHeight(milestones[0].height);

		const lastMilestone = milestones.find((milestone) => !!milestone.p2p && !!milestone.p2p.minimumVersions);

		if (lastMilestone && lastMilestone.p2p && configManager.getMilestone().p2p) {
			assert.equal(configManager.getMilestone().p2p.minimumVersions, lastMilestone.p2p.minimumVersions);
		}
	});

	it("should get milestone for height", () => {
		assert.equal(configManager.getMilestone(21_600), devnet.milestones[2]);
	});

	it("should get milestone for this.height if height is not provided as parameter", () => {
		configManager.setHeight(21_600);

		assert.equal(configManager.getMilestone(), devnet.milestones[2]);
	});

	it("should set the height", () => {
		configManager.setHeight(21_600);

		assert.equal(configManager.getHeight(), 21_600);
	});

	it("should determine if a new milestone is becoming active", () => {
		for (const milestone of devnet.milestones) {
			configManager.setHeight(milestone.height);
			assert.true(configManager.isNewMilestone());
		}

		configManager.setHeight(999_999);
		assert.false(configManager.isNewMilestone());

		configManager.setHeight(1);
		assert.false(configManager.isNewMilestone(999_999));
	});

	it("getNextMilestoneByKey - should throw an error if no milestones are set", () => {
		configManager.setConfig({ ...devnet, milestones: [] });
		assert.throws(
			() => configManager.getNextMilestoneWithNewKey(1, "blocktime"),
			`Attempted to get next milestone but none were set`,
		);
	});

	it("getNextMilestoneByKey - should get the next milestone with a given key", () => {
		configManager.setConfig(devnet);
		const expected = {
			data: 255,
			found: true,
			height: 1_750_000,
		};
		assert.equal(configManager.getNextMilestoneWithNewKey(1, "vendorFieldLength"), expected);
	});

	it("getNextMilestoneByKey - should return empty result if no next milestone is found", () => {
		configManager.setConfig(devnet);
		const expected = {
			data: null,
			found: false,
			height: 1_750_000,
		};
		assert.equal(configManager.getNextMilestoneWithNewKey(1_750_000, "vendorFieldLength"), expected);
	});

	it("getNextMilestoneByKey - should get all milestones", () => {
		const milestones = [
			{ blocktime: 8, height: 1 },
			{ blocktime: 9, height: 3 },
			{ blocktime: 10, height: 6 },
			{ blocktime: 8, height: 8 },
		];
		const config = { ...devnet, milestones };
		configManager.setConfig(config);
		const secondMilestone = {
			data: 9,
			found: true,
			height: 3,
		};
		const thirdMilestone = {
			data: 10,
			found: true,
			height: 6,
		};
		const fourthMilestone = {
			data: 8,
			found: true,
			height: 8,
		};
		const emptyMilestone = {
			data: null,
			found: false,
			height: 8,
		};
		assert.equal(configManager.getNextMilestoneWithNewKey(1, "blocktime"), secondMilestone);
		assert.equal(configManager.getNextMilestoneWithNewKey(3, "blocktime"), thirdMilestone);
		assert.equal(configManager.getNextMilestoneWithNewKey(4, "blocktime"), thirdMilestone);
		assert.equal(configManager.getNextMilestoneWithNewKey(6, "blocktime"), fourthMilestone);
		assert.equal(configManager.getNextMilestoneWithNewKey(8, "blocktime"), emptyMilestone);
	});
});
