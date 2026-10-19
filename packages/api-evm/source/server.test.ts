import { Identifiers } from "@mainsail/constants";
import { Application, Providers } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Server } from "./server.js";

describe<{
	app: Application;
	server: Server;
	configuration: Providers.PluginConfiguration;
}>("Server", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.app = new Application();

		context.configuration = context.app.resolve(Providers.PluginConfiguration).from("api-evm", {
			plugins: { socketTimeout: 5000 },
		});

		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({
			error: () => {},
			info: () => {},
			warn: () => {},
		});

		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(context.configuration)
			.whenTagged("plugin", "api-evm");

		context.server = context.app.resolve(Server);
	});

	it("baseName should be 'EVM API'", ({ server }) => {
		assert.is((server as any).baseName(), "EVM API");
	});

	it("pluginConfiguration should return the injected api-evm configuration", ({ server, configuration }) => {
		assert.is((server as any).pluginConfiguration(), configuration);
	});

	it("defaultOptions should strip trailing slash on the router", ({ server }) => {
		const options = (server as any).defaultOptions();

		assert.equal(options.router, { stripTrailingSlash: true });
	});

	it("defaultOptions should configure payload + validate failActions and validate context", ({ server }) => {
		const options = (server as any).defaultOptions();

		assert.instance(options.routes.payload.failAction, Function);
		assert.instance(options.routes.validate.failAction, Function);
		assert.equal(options.routes.validate.options.context, {
			configuration: {
				plugins: {},
			},
		});
	});
});
