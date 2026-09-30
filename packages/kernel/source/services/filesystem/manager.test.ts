import { describe } from "@mainsail/test-runner";

import { Application } from "../../application";
import { LocalFilesystem } from "./drivers/local";
import { FilesystemManager } from "./manager";

describe<{
	app: Application;
	manager: FilesystemManager;
}>("FilesystemManager", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.manager = context.app.resolve(FilesystemManager);
	});

	it("should boot and resolve the default (local) driver", async ({ manager }) => {
		await manager.boot();

		assert.instance(manager.driver(), LocalFilesystem);
	});
});
