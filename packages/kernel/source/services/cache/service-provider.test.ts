import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/constants";

import { describe } from "@mainsail/test-runner";
import { Application } from "../../application";
import { MemoryEventDispatcher } from "../events";
import { MemoryCacheStore } from "./drivers";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
}>("CacheServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.app.bind(Identifiers.Services.EventDispatcher.Service).to(MemoryEventDispatcher).inSingletonScope();
	});

	it("should register the service", async (context) => {
		assert.false(context.app.isBound(Identifiers.Services.Cache.Factory));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.Services.Cache.Factory));
	});

	it("should create an instance of the MemoryCacheStore", async (context) => {
		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.instance(
			await context.app.get<Contracts.Kernel.CacheFactory<string, string>>(Identifiers.Services.Cache.Factory)(),
			MemoryCacheStore,
		);
	});
});
