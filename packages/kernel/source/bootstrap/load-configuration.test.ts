import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import { Application } from "../application";
import { ConfigRepository } from "../services/config";
import { LoadConfiguration } from "./load-configuration";

describe<{
	app: Application;
	configRepository: ConfigRepository;
	loader: Record<string, () => void>;
	configManager: { driver: (name?: string) => unknown };
	handler: LoadConfiguration;
}>("LoadConfiguration", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.loader = { loadConfiguration: () => {}, loadEnvironmentVariables: () => {} };
		context.configManager = { driver: () => context.loader };

		context.app = new Application();
		context.app.bind(Identifiers.Services.Config.Manager).toConstantValue(context.configManager);

		context.configRepository = context.app.get<ConfigRepository>(Identifiers.Config.Repository);
		context.handler = context.app.resolve(LoadConfiguration);
	});

	it("should load the configuration through the default driver", async ({ handler, configManager, loader }) => {
		const spyDriver = spy(configManager, "driver");
		const spyLoad = spy(loader, "loadConfiguration");

		await handler.bootstrap();

		spyDriver.calledWith("local");
		spyLoad.calledOnce();
	});

	it("should use the configLoader defined in the config repository", async ({
		handler,
		configManager,
		configRepository,
	}) => {
		configRepository.set("configLoader", "custom");
		const spyDriver = spy(configManager, "driver");

		await handler.bootstrap();

		spyDriver.calledWith("custom");
	});
});
