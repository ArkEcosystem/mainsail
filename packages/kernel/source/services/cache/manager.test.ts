import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import { Application } from "../../application";
import { MemoryEventDispatcher } from "../events";
import { MemoryCacheStore } from "./drivers/memory";
import { CacheManager } from "./manager";

describe<{
	app: Application;
	manager: CacheManager;
}>("CacheManager", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.app.bind(Identifiers.Services.EventDispatcher.Service).to(MemoryEventDispatcher).inSingletonScope();
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({ warn: () => {} });

		context.manager = context.app.resolve(CacheManager);
	});

	it("should create the default (memory) driver", async ({ manager }) => {
		assert.instance(await manager.driver(), MemoryCacheStore);
	});
});
