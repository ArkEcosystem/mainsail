import { describe } from "../../../../core-test-framework";

import { Application } from "../../application";
import { Container, Identifiers } from "../../ioc";
import { ServiceProvider } from "./service-provider";
import { MemoryCacheStore } from "./drivers";
import { MemoryEventDispatcher } from "../events";
import { CacheFactory } from "../../types";

describe<{
	app: Application;
}>("CacheServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.app.bind(Identifiers.EventDispatcherService).to(MemoryEventDispatcher).inSingletonScope();
	});

	it("should register the service", async (context) => {
		assert.false(context.app.isBound(Identifiers.CacheFactory));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.CacheFactory));
	});

	it("should create an instance of the MemoryCacheStore", async (context) => {
		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.instance(
			await context.app.get<CacheFactory<string, string>>(Identifiers.CacheFactory)(),
			MemoryCacheStore,
		);
	});
});
