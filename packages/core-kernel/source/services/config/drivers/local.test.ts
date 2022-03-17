import { resolve } from "path";
import { describe } from "../../../../../core-test-framework";

import { Application } from "../../../application";
import { Container } from "@arkecosystem/core-container";
import { Identifiers, Exceptions } from "@arkecosystem/core-contracts";
import { LocalConfigLoader } from "./local";
import { ConfigRepository } from "../repository";
import { MemoryEventDispatcher } from "../../events";
import { JoiValidator } from "../../validation/drivers/joi";

describe<{
	app: Application;
	configLoader: LocalConfigLoader;
}>("LocalConfigLoader", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.app.bind(Identifiers.EventDispatcherService).toConstantValue(new MemoryEventDispatcher());
		context.app.bind(Identifiers.ConfigFlags).toConstantValue({});
		context.app.bind(Identifiers.ConfigPlugins).toConstantValue({});

		context.app.bind(Identifiers.ValidationService).to(JoiValidator);

		context.configLoader = context.app.resolve<LocalConfigLoader>(LocalConfigLoader);
	});

	it("should throw if it fails to load the environment variables", async (context) => {
		context.app.rebind("path.config").toConstantValue(resolve(__dirname, "../../../../test/stubs/config-empty"));

		await assert.rejects(
			() => context.configLoader.loadEnvironmentVariables(),
			Exceptions.EnvironmentConfigurationCannotBeLoaded,
		);
	});

	it("should throw if it fails to load the application configuration", async (context) => {
		context.app.rebind("path.config").toConstantValue(resolve(__dirname, "../../../../test/stubs/config-empty"));

		await assert.rejects(
			() => context.configLoader.loadConfiguration(),
			Exceptions.ApplicationConfigurationCannotBeLoaded,
			"Unable to load the application configuration file. Failed to discovery any files matching [app.json, app.js].",
		);
	});

	it("should throw if it fails to validate the application configuration", async (context) => {
		context.app
			.rebind("path.config")
			.toConstantValue(resolve(__dirname, "../../../../test/stubs/config-invalid-app"));

		await assert.rejects(
			() => context.configLoader.loadConfiguration(),
			Exceptions.ApplicationConfigurationCannotBeLoaded,
		);
	});

	it("should throw if it fails to validate the application peers configuration", async (context) => {
		context.app
			.rebind("path.config")
			.toConstantValue(resolve(__dirname, "../../../../test/stubs/config-invalid-peers"));

		await assert.rejects(
			() => context.configLoader.loadConfiguration(),
			Exceptions.ApplicationConfigurationCannotBeLoaded,
		);
	});

	it("should throw if it fails to validate the application delegates configuration", async (context) => {
		context.app
			.rebind("path.config")
			.toConstantValue(resolve(__dirname, "../../../../test/stubs/config-invalid-delegates"));

		await assert.rejects(
			() => context.configLoader.loadConfiguration(),
			Exceptions.ApplicationConfigurationCannotBeLoaded,
		);
	});

	it("should load the application configuration without cryptography", async (context) => {
		context.app.rebind("path.config").toConstantValue(resolve(__dirname, "../../../../test/stubs/config"));

		await context.configLoader.loadConfiguration();

		await assert.rejects(() =>
			context.app.get<ConfigRepository>(Identifiers.ConfigRepository).get("crypto.genesisBlock"),
		);
		await assert.rejects(() =>
			context.app.get<ConfigRepository>(Identifiers.ConfigRepository).get("crypto.exceptions"),
		);
		await assert.rejects(() =>
			context.app.get<ConfigRepository>(Identifiers.ConfigRepository).get("crypto.milestones"),
		);
		await assert.rejects(() =>
			context.app.get<ConfigRepository>(Identifiers.ConfigRepository).get("crypto.network"),
		);
	});

	it("should load the application configuration with cryptography", async (context) => {
		context.app
			.rebind("path.config")
			.toConstantValue(resolve(__dirname, "../../../../test/stubs/config-with-crypto"));

		await context.configLoader.loadConfiguration();

		assert.defined(context.app.get<ConfigRepository>(Identifiers.ConfigRepository).get("crypto.genesisBlock"));
		assert.defined(context.app.get<ConfigRepository>(Identifiers.ConfigRepository).get("crypto.milestones"));
		assert.defined(context.app.get<ConfigRepository>(Identifiers.ConfigRepository).get("crypto.network"));
	});
});
