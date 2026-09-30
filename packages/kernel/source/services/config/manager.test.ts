import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import { Application } from "../../application";
import { LocalConfigLoader } from "./drivers/local";
import { ConfigManager } from "./manager";

describe<{
	app: Application;
	manager: ConfigManager;
}>("ConfigManager", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application();
		// Dependencies the local config loader is constructed with.
		context.app.bind(Identifiers.Config.Flags).toConstantValue({});
		context.app.bind(Identifiers.Services.Validation.Service).toConstantValue({});

		context.manager = context.app.resolve(ConfigManager);
	});

	it("should boot and resolve the default (local) driver", async ({ manager }) => {
		await manager.boot();

		assert.instance(manager.driver(), LocalConfigLoader);
	});
});
