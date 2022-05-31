import { Identifiers } from "@arkecosystem/core-contracts";
import { RootDatabase } from "lmdb";
import { dirSync, setGracefulCleanup } from "tmp";

import { describe, Sandbox } from "../../core-test-framework";
import { ServiceProvider } from "./index";

describe<{
	sandbox: Sandbox;
}>("ServiceProvider", ({ beforeEach, beforeAll, it, assert }) => {
	beforeAll(() => {
		setGracefulCleanup();
	});

	beforeEach((context) => {
		context.sandbox = new Sandbox();
		context.sandbox.app.useDataPath(dirSync().name);
	});

	it("#register - should open database", async ({ sandbox }) => {
		assert.false(sandbox.app.isBound(Identifiers.Database.RootStorage));

		await assert.resolves(() => sandbox.app.resolve(ServiceProvider).register());

		assert.true(sandbox.app.isBound(Identifiers.Database.RootStorage));
	});

	it("root storage is lmdb storage", async ({ sandbox }) => {
		await sandbox.app.resolve(ServiceProvider).register();

		const storage = sandbox.app.get<RootDatabase>(Identifiers.Database.RootStorage);
		await storage.put("test", "test");

		assert.equal(storage.get("test"), "test");
	});
});
