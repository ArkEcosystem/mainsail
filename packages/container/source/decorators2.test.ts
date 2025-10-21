import { describe, Sandbox } from "../../test-framework/source";
import { Log } from "../../kernel/source/services";

describe<{
	sandbox: Sandbox;
}>("Decorators", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		const sandbox = (context.sandbox = new Sandbox());
	});

	it("should register service providers", async ({ sandbox }) => {
		await sandbox.app.resolve(Log.ServiceProvider).register();
	});
});
