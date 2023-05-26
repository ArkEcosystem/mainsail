import { Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { Consensus } from "./consensus";
import { Step } from "./enums";

describe<{
	sandbox: Sandbox;
	consensus: Consensus;
	blockProcessor: any;
	state: any;
	handler: any;
	broadcaster: any;
	scheduler: any;
	validatorsRepository: any;
	validatorSet: any;
	logger: any;
}>("Consensus", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.blockProcessor = {
			commit: () => {},
			process: () => {},
		};

		context.state = {
			getLastBlock: () => {},
		};

		context.handler = {
			onPrecommit: () => {},
			onPrevote: () => {},
			onProposal: () => {},
		};

		context.broadcaster = {
			broadcastPrecommit: () => {},
			broadcastPrevote: () => {},
			broadcastProposal: () => {},
		};

		context.scheduler = {
			scheduleTimeoutPrecommit: () => {},
			scheduleTimeoutPrevote: () => {},
			scheduleTimeoutPropose: () => {},
		};

		context.validatorsRepository = {
			getValidators: () => {},
		};

		context.validatorSet = {
			getActiveValidators: () => {},
		};

		context.logger = {
			info: () => {},
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.BlockProcessor).toConstantValue(context.blockProcessor);
		context.sandbox.app.bind(Identifiers.StateStore).toConstantValue(context.state);
		context.sandbox.app.bind(Identifiers.Consensus.Handler).toConstantValue(context.handler);
		context.sandbox.app.bind(Identifiers.Consensus.Broadcaster).toConstantValue(context.broadcaster);
		context.sandbox.app.bind(Identifiers.Consensus.Scheduler).toConstantValue(context.scheduler);
		context.sandbox.app
			.bind(Identifiers.Consensus.ValidatorRepository)
			.toConstantValue(context.validatorsRepository);
		context.sandbox.app.bind(Identifiers.ValidatorSet).toConstantValue(context.validatorSet);
		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(context.logger);

		context.consensus = context.sandbox.app.resolve(Consensus);
	});

	it("#getHeight - should return initial value", async ({ consensus }) => {
		assert.equal(consensus.getHeight(), 2);
	});

	it("#getRound - should return initial value", async ({ consensus }) => {
		assert.equal(consensus.getRound(), 0);
	});

	it("#getStep - should return initial value", async ({ consensus }) => {
		assert.equal(consensus.getStep(), Step.propose);
	});

	it("#getLockedValue - should return initial value", async ({ consensus }) => {
		assert.undefined(consensus.getLockedValue());
	});

	it("#getLockedRound - should return initial value", async ({ consensus }) => {
		assert.equal(consensus.getLockedRound(), -1);
	});

	it("#getValidValue - should return initial value", async ({ consensus }) => {
		assert.undefined(consensus.getValidValue());
	});

	it("#getValidRound - should return initial value", async ({ consensus }) => {
		assert.equal(consensus.getValidRound(), -1);
	});

	it("#getState - should return initial value", async ({ consensus }) => {
		assert.equal(consensus.getState(), {
			height: 2,
			lockedRound: -1,
			lockedValue: undefined,
			round: 0,
			step: Step.propose,
			validRound: -1,
			validValue: undefined,
		});
	});
});
