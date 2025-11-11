import { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";

import { describe, Sandbox } from "../../test-framework/source";
import { TimestampCalculator } from "./timestamp-calculator";

type Context = {
	sandbox: Sandbox;
	timestampCalculator: TimestampCalculator;
	configuration: any;
	timeouts: Partial<Contracts.Crypto.MilestoneTimeouts>;
};

describe<Context>("TimestampCalculator", ({ assert, it, beforeEach }) => {
	beforeEach((context: Context) => {
		context.sandbox = new Sandbox();

		context.timeouts = {
			blockTime: 0,
			stageTimeout: 0,
			stageTimeoutIncrease: 0,
		};

		context.configuration = {
			getMilestone: () => {
				return {
					timeouts: context.timeouts,
				};
			},
		};

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);

		context.timestampCalculator = context.sandbox.app.resolve(TimestampCalculator);
	});

	it("should throw if round is too high", async ({ timestampCalculator }) => {
		const block = {
			data: {
				timestamp: 0,
			},
		} as Contracts.Crypto.Block;

		const round = 100_001;

		assert.throws(
			() => timestampCalculator.calculateMinimalTimestamp(block, round),
			new Error(`Round ${round} is too high`),
		);
	});

	it("should throw if round is too high", async ({ timestampCalculator }) => {
		const block = {
			data: {
				timestamp: 0,
			},
		} as Contracts.Crypto.Block;

		const round = 100_001;

		assert.throws(
			() => timestampCalculator.calculateMinimalTimestamp(block, round),
			new Error(`Round ${round} is too high`),
		);
	});

	it("should return block timestamp if all milestones values are 0", async ({ timestampCalculator }) => {
		const block = {
			data: {
				timestamp: 0,
			},
		} as Contracts.Crypto.Block;

		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 0), 0);

		const block2 = {
			data: {
				timestamp: 1000,
			},
		} as Contracts.Crypto.Block;
		assert.equal(timestampCalculator.calculateMinimalTimestamp(block2, 0), 1000);
	});

	it("should read blockTime from milestones and use it only once", async ({ timestampCalculator, timeouts }) => {
		const block = {
			data: {
				timestamp: 0,
			},
		} as Contracts.Crypto.Block;

		timeouts.blockTime = 1000;

		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 0), 1000);
		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 1), 1000);
		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 2), 1000);
	});

	it("should read stageTimeout from milestones and increase it every round", async ({
		timestampCalculator,
		timeouts,
	}) => {
		const block = {
			data: {
				timestamp: 0,
			},
		} as Contracts.Crypto.Block;

		timeouts.stageTimeout = 1000;

		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 0), 0);
		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 1), 1000);
		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 2), 2000);
	});

	it("should read stageTimeoutIncrease from milestones and increase it every round after 2nd arithmetically", async ({
		timestampCalculator,
		timeouts,
	}) => {
		const block = {
			data: {
				timestamp: 0,
			},
		} as Contracts.Crypto.Block;

		timeouts.stageTimeoutIncrease = 1000;

		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 0), 0);
		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 2), 1000);
		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 3), 3000);
		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 4), 6000);
		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 5), 10000);
		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 6), 15000);
	});

	it("should read all milestone values and increase each round accordingly", async ({
		timestampCalculator,
		timeouts,
	}) => {
		const block = {
			data: {
				timestamp: 0,
			},
		} as Contracts.Crypto.Block;

		timeouts.blockTime = 1000;
		timeouts.stageTimeout = 1000;
		timeouts.stageTimeoutIncrease = 1000;

		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 0), 1000 + 0 + 0);
		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 1), 1000 + 1000 + 0);
		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 2), 1000 + 2000 + 1000);
		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 3), 1000 + 3000 + 3000);
		assert.equal(timestampCalculator.calculateMinimalTimestamp(block, 4), 1000 + 4000 + 6000);
	});
});
