import { describe } from "@mainsail/test-runner";

import { Application } from "../../application";
import { JoiValidator } from "./drivers/joi";
import { ValidationManager } from "./manager";

describe<{
	app: Application;
	manager: ValidationManager;
}>("ValidationManager", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.manager = context.app.resolve(ValidationManager);
	});

	it("should boot and resolve the default (joi) driver", async ({ manager }) => {
		await manager.boot();

		assert.instance(manager.driver(), JoiValidator);
	});
});
