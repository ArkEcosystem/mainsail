import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { describe } from "../../../../test-framework";
import { Application } from "../../application";
import { MemoryEventDispatcher } from "./drivers";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
}>("EventDispatcherServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
	});
	it(".register", async (context) => {
		assert.false(context.app.isBound(Identifiers.Kernel.EventDispatcher.Manager));
		assert.false(context.app.isBound(Identifiers.Kernel.EventDispatcher.Service));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.Kernel.EventDispatcher.Manager));
		assert.true(context.app.isBound(Identifiers.Kernel.EventDispatcher.Service));
		assert.instance(context.app.get(Identifiers.Kernel.EventDispatcher.Service), MemoryEventDispatcher);
	});
});
