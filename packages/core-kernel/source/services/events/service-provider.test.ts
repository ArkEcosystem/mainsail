import { describe } from "../../../../core-test-framework";

import { Application } from "../../application";
import { Container, Identifiers } from "../../ioc";
import { ServiceProvider } from "./service-provider";
import { MemoryEventDispatcher } from "./drivers";

describe<{
	app: Application;
}>("EventDispatcherServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
	});
	it(".register", async (context) => {
		assert.false(context.app.isBound(Identifiers.EventDispatcherManager));
		assert.false(context.app.isBound(Identifiers.EventDispatcherService));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.EventDispatcherManager));
		assert.true(context.app.isBound(Identifiers.EventDispatcherService));
		assert.instance(context.app.get(Identifiers.EventDispatcherService), MemoryEventDispatcher);
	});
});
