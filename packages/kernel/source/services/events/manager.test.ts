import { describe } from "@mainsail/test-runner";

import { Application } from "../../application";
import { MemoryEventDispatcher } from "./drivers/memory";
import { EventDispatcherManager } from "./manager";

describe<{
	app: Application;
	manager: EventDispatcherManager;
}>("EventDispatcherManager", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.manager = context.app.resolve(EventDispatcherManager);
	});

	it("should boot and resolve the default (memory) driver", async ({ manager }) => {
		await manager.boot();

		assert.instance(manager.driver(), MemoryEventDispatcher);
	});
});
