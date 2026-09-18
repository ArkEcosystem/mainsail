import type { Database, RootDatabase } from "lmdb";

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { dirSync, setGracefulCleanup } from "tmp";

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

	it("#register - should bind the storage and the service", async ({ serviceProvider, app }) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.ConsensusStorage.Root));
		assert.true(app.isBound(Identifiers.ConsensusStorage.Storage.Proposal));
		assert.true(app.isBound(Identifiers.ConsensusStorage.Storage.Message));
		assert.true(app.isBound(Identifiers.ConsensusStorage.Storage.ConsensusState));
		assert.true(app.isBound(Identifiers.ConsensusStorage.Service));
	});

	it("#register - should store proposals and messages as bytes", async ({ serviceProvider, app }) => {
		await serviceProvider.register();
		const bytes = Buffer.from("01ff", "hex");

		for (const identifier of [
			Identifiers.ConsensusStorage.Storage.Proposal,
			Identifiers.ConsensusStorage.Storage.Message,
		]) {
			const storage = app.get<Database<Buffer>>(identifier);
			await storage.put("key", bytes);

			const stored = storage.get("key");
			assert.true(Buffer.isBuffer(stored));
			assert.true(stored.equals(bytes));
		}
	});

	it("#dispose - should close the root storage", async ({ serviceProvider, app }) => {
		await serviceProvider.register();
		const close = spy(app.get<RootDatabase>(Identifiers.ConsensusStorage.Root), "close");

		await serviceProvider.dispose();

		close.calledOnce();
	});
});
