import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import { Application } from "../application";
import { RegisterBaseBindings } from "./register-base-bindings";

describe<{
	app: Application;
	fileSystem: Record<string, any>;
	handler: RegisterBaseBindings;
}>("RegisterBaseBindings", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.fileSystem = { readJSONSync: () => ({ version: "1.2.3" }) };

		context.app = new Application();
		context.app.bind(Identifiers.Services.Filesystem.Service).toConstantValue(context.fileSystem);
		context.app.config("app.flags", { env: "test", name: "mainsail-test", thread: "worker-1" });

		context.handler = context.app.resolve(RegisterBaseBindings);
	});

	it("should bind the application environment, name, thread and version", async ({ app, handler }) => {
		await handler.bootstrap();

		assert.equal(app.get(Identifiers.Application.Environment), "test");
		assert.equal(app.get(Identifiers.Application.Name), "mainsail-test");
		assert.equal(app.get(Identifiers.Application.Thread), "worker-1");
		assert.equal(app.get(Identifiers.Application.Version), "1.2.3");
	});

	it("should default the thread to 'main' when no thread flag is given", async ({ app, handler }) => {
		app.config("app.flags", { env: "test", name: "mainsail-test" });

		await handler.bootstrap();

		assert.equal(app.get(Identifiers.Application.Thread), "main");
	});

	it("should throw if the name flag is missing", async ({ app, handler }) => {
		app.config("app.flags", { env: "test" });

		await assert.rejects(() => handler.bootstrap());
	});
});
