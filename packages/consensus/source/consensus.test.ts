import { Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { Consensus } from "./consensus";

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

	it("should run", async (context) => {});
});
