import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";

import { describe } from "../../../../core-test-framework";
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
		assert.false(context.app.isBound(Identifiers.EventDispatcherManager));
		assert.false(context.app.isBound(Identifiers.EventDispatcherService));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.EventDispatcherManager));
		assert.true(context.app.isBound(Identifiers.EventDispatcherService));
		assert.instance(context.app.get(Identifiers.EventDispatcherService), MemoryEventDispatcher);
	});
});
