import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import { Application } from "../application";
import { MemoryEventDispatcher } from "../services/events";
import { RegisterBaseServiceProviders } from "./register-base-service-providers";

describe<{
	app: Application;
	handler: RegisterBaseServiceProviders;
}>("RegisterBaseServiceProviders", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.app.bind(Identifiers.Services.EventDispatcher.Service).to(MemoryEventDispatcher).inSingletonScope();

		context.handler = context.app.resolve(RegisterBaseServiceProviders);
	});

	it("should register all base service providers", async ({ app, handler }) => {
		await assert.resolves(() => handler.bootstrap());

		assert.true(app.isBound(Identifiers.Services.Log.Service));
		assert.true(app.isBound(Identifiers.Services.Trigger.Service));
		assert.true(app.isBound(Identifiers.Services.Filesystem.Service));
		assert.true(app.isBound(Identifiers.Services.Cache.Factory));
		assert.true(app.isBound(Identifiers.Services.Pipeline.Factory));
		assert.true(app.isBound(Identifiers.Services.Queue.Factory));
		assert.true(app.isBound(Identifiers.Services.Validation.Service));
		assert.true(app.isBound(Identifiers.Services.Schedule.Service));
	});
});
