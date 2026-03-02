import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { dirSync, setGracefulCleanup } from "tmp";

import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		const app = new Application();

		setGracefulCleanup();
		app.rebind("path.data").toConstantValue(dirSync().name);

		app.bind(Identifiers.Services.Filesystem.Service).toConstantValue({
			existsSync: () => true,
		});

		context.serviceProvider = app.resolve(ServiceProvider);
		context.app = app;
	});

	it("#register - should be ok", async ({ serviceProvider, app }) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.ConsensusStorage.Root));
		assert.true(app.isBound(Identifiers.ConsensusStorage.Storage.Proposal));
		assert.true(app.isBound(Identifiers.ConsensusStorage.Storage.Message));
		assert.true(app.isBound(Identifiers.ConsensusStorage.Storage.ConsensusState));
		assert.true(app.isBound(Identifiers.ConsensusStorage.Service));
	});

	it("#dispose - should call persist with round and consensus state data", async ({ serviceProvider, app }) => {
		await serviceProvider.register();

		const message1 = {
			msg: 1,
		};

		const message2 = {
			msg: 2,
		};

		const message3 = {
			msg: 3,
		};

		const message4 = {
			msg: 4,
		};

		const proposal1 = {
			proposal: 1,
		};

		const proposal2 = {
			proposal: 2,
		};

		app.bind(Identifiers.Consensus.RoundStateRepository).toConstantValue({
			getRoundStates: () => [
				{
					getMessages: () => [message1],
					getProposal: () => proposal1,
				},
				{
					getMessages: () => [message2, message3],
					getProposal: () => proposal2,
				},
				{
					getMessages: () => [message4],
					getProposal: () => undefined,
				},
			],
		});

		const state = {
			state: 1,
		};

		app.bind(Identifiers.Consensus.Service).toConstantValue({
			getState: () => state,
		});

		const consensusStorageService = {
			persist: () => {},
		};
		app.rebind(Identifiers.ConsensusStorage.Service).toConstantValue(consensusStorageService);

		const spyPersist = spy(consensusStorageService, "persist");

		await serviceProvider.dispose();

		spyPersist.calledOnce();
		spyPersist.calledWith({
			messages: [message1, message2, message3, message4],
			proposals: [proposal1, proposal2],
			state: state,
		});
	});
});
