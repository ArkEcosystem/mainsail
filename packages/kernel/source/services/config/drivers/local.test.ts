import { Container } from "@mainsail/container";
import { Exceptions, Identifiers } from "@mainsail/contracts";
import { join, resolve } from "path";

import { describe } from "../../../../../test-framework/source";
import { Application } from "../../../application";
import { MemoryEventDispatcher } from "../../events";
import { JoiValidator } from "../../validation/drivers/joi";
import { ConfigRepository } from "../repository";
import { LocalConfigLoader } from "./local";

describe<{
	app: Application;
	configLoader: LocalConfigLoader;
}>("LocalConfigLoader", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(new MemoryEventDispatcher());
		context.app.bind(Identifiers.Config.Flags).toConstantValue({});
		context.app.bind(Identifiers.Config.Plugins).toConstantValue({});
		context.app.bind(Identifiers.Services.Filesystem.Service).toConstantValue({ existsSync: () => true });

		context.app.bind(Identifiers.Services.Validation.Service).to(JoiValidator);

		context.configLoader = context.app.resolve<LocalConfigLoader>(LocalConfigLoader);
	});

	it("should throw if it fails to load the environment variables", async (context) => {
		context.app
			.rebind("path.config")
			.toConstantValue(join(import.meta.dirname, "../../../../test/stubs/config-empty"));

		await assert.rejects(
			() => context.configLoader.loadEnvironmentVariables(),
			Exceptions.EnvironmentConfigurationCannotBeLoaded,
		);
	});

	it("should throw if it fails to load the application configuration", async (context) => {
		context.app
			.rebind("path.config")
			.toConstantValue(join(import.meta.dirname, "../../../../test/stubs/config-empty"));

		await assert.rejects(
			() => context.configLoader.loadConfiguration(),
			Exceptions.ApplicationConfigurationCannotBeLoaded,
			"Unable to load the application configuration file. Failed to discovery any files matching [app.json].",
		);
	});

	it("should throw if it fails to validate the application configuration", async (context) => {
		context.app
			.rebind("path.config")
			.toConstantValue(join(import.meta.dirname, "../../../../test/stubs/config-invalid-app"));

		await assert.rejects(
			() => context.configLoader.loadConfiguration(),
			Exceptions.ApplicationConfigurationCannotBeLoaded,
		);
	});

	it("should throw if it fails to validate the application peers configuration", async (context) => {
		context.app
			.rebind("path.config")
			.toConstantValue(join(import.meta.dirname, "../../../../test/stubs/config-invalid-peers"));

		await assert.rejects(
			() => context.configLoader.loadConfiguration(),
			Exceptions.ApplicationConfigurationCannotBeLoaded,
		);
	});

	it("should throw if it fails to validate the application delegates configuration", async (context) => {
		context.app
			.rebind("path.config")
			.toConstantValue(join(import.meta.dirname, "../../../../test/stubs/config-invalid-delegates"));

		await assert.rejects(
			() => context.configLoader.loadConfiguration(),
			Exceptions.ApplicationConfigurationCannotBeLoaded,
		);
	});

	it("should load the application configuration without cryptography", async (context) => {
		context.app
			.rebind("path.config")
			.toConstantValue(join(import.meta.dirname, "../../../../test/stubs/config/local"));

		await context.configLoader.loadConfiguration();

		await assert.rejects(() =>
			context.app.get<ConfigRepository>(Identifiers.Config.Repository).get("crypto.genesisBlock"),
		);
		await assert.rejects(() =>
			context.app.get<ConfigRepository>(Identifiers.Config.Repository).get("crypto.exceptions"),
		);
		await assert.rejects(() =>
			context.app.get<ConfigRepository>(Identifiers.Config.Repository).get("crypto.milestones"),
		);
		await assert.rejects(() =>
			context.app.get<ConfigRepository>(Identifiers.Config.Repository).get("crypto.network"),
		);
	});

	it("should load the application configuration with cryptography", async (context) => {
		context.app
			.rebind("path.config")
			.toConstantValue(join(import.meta.dirname, "../../../../test/stubs/config-with-crypto"));

		await context.configLoader.loadConfiguration();

		assert.defined(context.app.get<ConfigRepository>(Identifiers.Config.Repository).get("crypto.genesisBlock"));
		assert.defined(context.app.get<ConfigRepository>(Identifiers.Config.Repository).get("crypto.milestones"));
		assert.defined(context.app.get<ConfigRepository>(Identifiers.Config.Repository).get("crypto.network"));
	});
});
