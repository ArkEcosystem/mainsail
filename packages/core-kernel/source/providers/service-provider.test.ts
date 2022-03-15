import { resolve } from "path";

import { describe } from "../../../core-test-framework";
import { Application } from "../application";
import { Container } from "../ioc";
import { PluginConfiguration } from "./plugin-configuration";
import { PluginManifest } from "./plugin-manifest";
import { ServiceProvider } from "./service-provider";

class StubServiceProvider extends ServiceProvider {
	async register() {}
}

describe<{
	app: Application;
}>("ServiceProvider", ({ assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
	});

	it(".register", async (context) => {
		const serviceProvider: ServiceProvider = context.app.resolve(StubServiceProvider);

		const theSpy = spy(serviceProvider, "register");

		await serviceProvider.register();

		theSpy.calledOnce();
	});

	it(".boot", async (context) => {
		const serviceProvider: ServiceProvider = context.app.resolve(StubServiceProvider);

		const theSpy = spy(serviceProvider, "boot");

		await serviceProvider.boot();

		theSpy.calledOnce();
	});

	it(".dispose", async (context) => {
		const serviceProvider: ServiceProvider = context.app.resolve(StubServiceProvider);

		const theSpy = spy(serviceProvider, "dispose");

		await serviceProvider.dispose();

		theSpy.calledOnce();
	});

	it(".manifest", (context) => {
		const serviceProvider: ServiceProvider = context.app.resolve(StubServiceProvider);

		const pluginManifest: PluginManifest = new PluginManifest().discover(
			resolve(__dirname, "../../test/stubs/stub-plugin"),
		);
		serviceProvider.setManifest(pluginManifest);

		assert.equal(serviceProvider.manifest(), pluginManifest);
	});

	it(".name", (context) => {
		const serviceProvider: ServiceProvider = context.app.resolve(StubServiceProvider);

		serviceProvider.setManifest(new PluginManifest().discover(resolve(__dirname, "../../test/stubs/stub-plugin")));

		assert.is(serviceProvider.name(), "stub-plugin");
	});

	it(".name (no manifest)", (context) => {
		assert.undefined(context.app.resolve(StubServiceProvider).name());
	});

	it(".version", (context) => {
		const serviceProvider: ServiceProvider = context.app.resolve(StubServiceProvider);

		serviceProvider.setManifest(new PluginManifest().discover(resolve(__dirname, "../../test/stubs/stub-plugin")));

		assert.is(serviceProvider.version(), "1.0.0");
	});

	it(".version (no manifest)", (context) => {
		assert.undefined(context.app.resolve(StubServiceProvider).version());
	});

	it(".alias", (context) => {
		const serviceProvider: ServiceProvider = context.app.resolve(StubServiceProvider);

		serviceProvider.setManifest(new PluginManifest().discover(resolve(__dirname, "../../test/stubs/stub-plugin")));

		assert.is(serviceProvider.alias(), "some-alias");
	});

	it(".alias (no manifest)", (context) => {
		assert.undefined(context.app.resolve(StubServiceProvider).alias());
	});

	it(".config", (context) => {
		const serviceProvider: ServiceProvider = context.app.resolve(StubServiceProvider);

		const pluginConfiguration: PluginConfiguration = context.app
			.resolve(PluginConfiguration)
			.discover("stub-plugin", resolve(__dirname, "../../test/stubs/stub-plugin"));
		serviceProvider.setConfig(pluginConfiguration);

		assert.equal(serviceProvider.config(), pluginConfiguration);
	});

	it(".configDefaults", (context) => {
		assert.equal(context.app.resolve(StubServiceProvider).configDefaults(), {});
	});

	it(".configSchema", (context) => {
		assert.equal(context.app.resolve(StubServiceProvider).configSchema(), {});
	});

	it(".dependencies", (context) => {
		const serviceProvider: ServiceProvider = context.app.resolve(StubServiceProvider);

		serviceProvider.setManifest(new PluginManifest().discover(resolve(__dirname, "../../test/stubs/stub-plugin")));

		assert.equal(serviceProvider.dependencies(), [{ name: "some-dependency" }]);
	});

	it(".dependencies (no manifest)", (context) => {
		assert.equal(context.app.resolve(StubServiceProvider).dependencies(), []);
	});

	it(".bootWhen", async (context) => {
		assert.true(await context.app.resolve(StubServiceProvider).bootWhen());
	});

	it(".disposeWhen", async (context) => {
		assert.false(await context.app.resolve(StubServiceProvider).disposeWhen());
	});

	it(".required", async (context) => {
		const serviceProvider: ServiceProvider = context.app.resolve(StubServiceProvider);

		serviceProvider.setManifest(new PluginManifest().discover(resolve(__dirname, "../../test/stubs/stub-plugin")));

		assert.true(await serviceProvider.required());
	});

	it(".required (no manifest)", async (context) => {
		assert.false(await context.app.resolve(StubServiceProvider).required());
	});
});
