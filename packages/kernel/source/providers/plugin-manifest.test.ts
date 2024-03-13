import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { readJSONSync } from "fs-extra";
import { resolve } from "path";

import { describe } from "../../../test-framework/source";
import { Application } from "../application";
import { ConfigRepository } from "../services/config";
import { PluginManifest } from "./plugin-manifest";

describe<{
	app: Application;
	pluginManifest: PluginManifest;
}>("PluginManifest", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.app.bind(Identifiers.Config.Repository).to(ConfigRepository).inSingletonScope();
		context.app
			.bind(Identifiers.Services.Filesystem.Service)
			.toConstantValue({ existsSync: () => true, readJSONSync: (path: string) => readJSONSync(path) });

		context.pluginManifest = context.app.resolve<PluginManifest>(PluginManifest);
	});

	it("should discover the manifest for the given plugin", (context) => {
		context.pluginManifest.discover(resolve(__dirname, "../../test/stubs/stub-plugin"));

		assert.true(context.pluginManifest.has("name"));
		assert.equal(context.pluginManifest.get("name"), "stub-plugin");
	});

	it("should merge the given value", (context) => {
		// @ts-ignore
		context.pluginManifest.merge({ some: "value" });

		assert.equal(context.pluginManifest.get("some"), "value");
	});
});
