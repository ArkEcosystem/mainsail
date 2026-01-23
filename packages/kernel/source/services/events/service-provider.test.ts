import { Identifiers } from "@mainsail/constants";

import { describe } from "@mainsail/test-runner";
import { Application } from "../../application";
import { MemoryEventDispatcher } from "./drivers";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
}>("EventDispatcherServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application();
	});
	it(".register", async (context) => {
		assert.false(context.app.isBound(Identifiers.Services.EventDispatcher.Manager));
		assert.false(context.app.isBound(Identifiers.Services.EventDispatcher.Service));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.Services.EventDispatcher.Manager));
		assert.true(context.app.isBound(Identifiers.Services.EventDispatcher.Service));
		assert.instance(context.app.get(Identifiers.Services.EventDispatcher.Service), MemoryEventDispatcher);
	});
});
