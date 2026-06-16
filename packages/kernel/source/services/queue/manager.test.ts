import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import { Application } from "../../application";
import { MemoryEventDispatcher } from "../events";
import { MemoryQueue } from "./drivers/memory";
import { QueueManager } from "./manager";

describe<{
	app: Application;
	manager: QueueManager;
}>("QueueManager", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.app.bind(Identifiers.Services.EventDispatcher.Service).to(MemoryEventDispatcher).inSingletonScope();
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({ debug: () => {}, warning: () => {} });

		context.manager = context.app.resolve(QueueManager);
	});

	it("should create the default (memory) driver", async ({ manager }) => {
		assert.instance(await manager.driver(), MemoryQueue);
	});
});
