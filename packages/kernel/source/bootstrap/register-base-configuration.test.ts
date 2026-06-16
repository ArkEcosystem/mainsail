import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import { Application } from "../application";
import { ConfigManager, ConfigRepository } from "../services/config";
import { RegisterBaseConfiguration } from "./register-base-configuration";

describe<{
	app: Application;
	configRepository: ConfigRepository;
	handler: RegisterBaseConfiguration;
}>("RegisterBaseConfiguration", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.app.bind(Identifiers.Config.Flags).toConstantValue({ env: "test", name: "mainsail-test" });
		// LocalConfigLoader (resolved when the manager boots) injects the validation service.
		context.app.bind(Identifiers.Services.Validation.Service).toConstantValue({});

		context.configRepository = context.app.get<ConfigRepository>(Identifiers.Config.Repository);
		context.handler = context.app.resolve(RegisterBaseConfiguration);
	});

	it("should bind and boot the config manager", async ({ app, handler }) => {
		await handler.bootstrap();

		const manager = app.get<ConfigManager>(Identifiers.Services.Config.Manager);
		assert.defined(manager);
		// boot() registers the default (local) driver, so it is resolvable.
		assert.defined(manager.driver("local"));
	});

	it("should copy the flags into the config repository", async ({ handler, configRepository }) => {
		await handler.bootstrap();

		assert.equal(configRepository.get("app.flags"), { env: "test", name: "mainsail-test" });
	});
});
