import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { dirSync, setGracefulCleanup } from "tmp";

import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider";


describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ beforeEach, afterEach, it, assert, stubFn }) => {
	beforeEach((context) => {
		const app = new Application();

		setGracefulCleanup();
		app.rebind("path.data").toConstantValue(dirSync().name);

		app.bind(Identifiers.Services.Filesystem.Service).toConstantValue({
			existsSync: () => true
		})

		context.serviceProvider = app.resolve(ServiceProvider);
		context.app = app;
	});

	it("should register", async ({serviceProvider, app}) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.ConsensusStorage.Root));
		assert.true(app.isBound(Identifiers.ConsensusStorage.Storage.Proposal));
		assert.true(app.isBound(Identifiers.ConsensusStorage.Storage.Message));
		assert.true(app.isBound(Identifiers.ConsensusStorage.Storage.ConsensusState));
		assert.true(app.isBound(Identifiers.ConsensusStorage.Service));
	});

});
