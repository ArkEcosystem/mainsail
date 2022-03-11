import { resolve } from "path";

import { describe } from "../../../core-test-framework";
import { Application } from "../application";
import { Container, Identifiers } from "../ioc";
import { ConfigRepository } from "../services/config";
import { PluginConfiguration } from "./plugin-configuration";

describe<{
	app: Application;
	pluginConfiguration: PluginConfiguration;
}>("PluginConfiguration", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.pluginConfiguration = context.app.resolve<PluginConfiguration>(PluginConfiguration);
	});

	it("should create an instance from a name and defaults", (context) => {
		context.app.get<ConfigRepository>(Identifiers.ConfigRepository).set("app.pluginOptions", {
			dummy: { key: "value" },
		});

		const instance: PluginConfiguration = context.pluginConfiguration.from("dummy", { some: "value" });

		assert.equal(instance.all(), { key: "value", some: "value" });
	});

	it("should discover the defaults for the given plugin", (context) => {
		context.pluginConfiguration.discover(
			"stub-plugin-with-defaults",
			resolve(__dirname, "../../test/stubs/stub-plugin-with-defaults"),
		);

		assert.equal(context.pluginConfiguration.all(), { defaultKey: "defaultValue" });
	});

	it("should set and get the given value", (context) => {
		context.pluginConfiguration.set("key", "value");

		assert.equal(context.pluginConfiguration.all(), { key: "value" });
		assert.equal(context.pluginConfiguration.get("key"), "value");
		assert.true(context.pluginConfiguration.has("key"));
		assert.equal(context.pluginConfiguration.getOptional("key", "default value"), "value");
		assert.equal(context.pluginConfiguration.getRequired("key"), "value");

		context.pluginConfiguration.unset("key");

		assert.equal(context.pluginConfiguration.all(), {});
		assert.undefined(context.pluginConfiguration.get("key"));
		assert.false(context.pluginConfiguration.has("key"));
		assert.equal(context.pluginConfiguration.getOptional("key", "default value"), "default value");
		assert.rejects(() => context.pluginConfiguration.getRequired("key"));
	});

	it("should throw when using deprecated get default value argument", (context) => {
		assert.rejects(() => context.pluginConfiguration.get("key", "default value"));
	});

	it("should merge the given value", (context) => {
		context.pluginConfiguration.set("key", "value");
		context.pluginConfiguration.merge({ some: "value" });

		assert.equal(context.pluginConfiguration.all(), { key: "value", some: "value" });
	});

	it("should merge nested object", (context) => {
		context.pluginConfiguration.set("key", {
			"1": {
				"1.1": "test",
			},
		});
		context.pluginConfiguration.merge({
			key: {
				"1": {
					"1.2": "test",
				},
			},
		});

		assert.equal(context.pluginConfiguration.all(), {
			key: {
				"1": {
					"1.1": "test",
					"1.2": "test",
				},
			},
		});
	});

	it("should override array", (context) => {
		context.pluginConfiguration.set("key", [1, 2, 3]);
		context.pluginConfiguration.merge({
			key: [3, 4, 5],
		});

		assert.equal(context.pluginConfiguration.all(), {
			key: [3, 4, 5],
		});
	});
});
