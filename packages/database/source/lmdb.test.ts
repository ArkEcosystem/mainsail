import { Identifiers } from "@mainsail/contracts";
import { RootDatabase } from "lmdb";
import { dirSync, setGracefulCleanup } from "tmp";

import { describe, Sandbox } from "../../test-framework/source";
import { ServiceProvider } from "./index";

describe<{
	sandbox: Sandbox;
}>("Lmdb", ({ beforeEach, beforeAll, it, assert }) => {
	beforeAll(() => {
		setGracefulCleanup();
	});

	beforeEach((context) => {
		context.sandbox = new Sandbox();
		context.sandbox.app.bind(Identifiers.Services.Filesystem.Service).toConstantValue({ existsSync: () => true });
		context.sandbox.app.useDataPath(dirSync().name);
	});

	it("#register - should open database", async ({ sandbox }) => {
		assert.false(sandbox.app.isBound(Identifiers.Database.Root));

		await assert.resolves(() => sandbox.app.resolve(ServiceProvider).register());

		assert.true(sandbox.app.isBound(Identifiers.Database.Root));
	});

	it("root storage is lmdb storage", async ({ sandbox }) => {
		await sandbox.app.resolve(ServiceProvider).register();

		const storage = sandbox.app.get<RootDatabase>(Identifiers.Database.Root);
		await storage.put("test", "test");

		assert.equal(storage.get("test"), "test");
	});
});
