import { Identifiers } from "@mainsail/constants";
import { Application, Providers } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Server } from "./server";

describe<{
	app: Application;
	server: Server;
	configuration: Providers.PluginConfiguration;
}>("Server", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.app = new Application();

		context.configuration = context.app.resolve(Providers.PluginConfiguration).from("api-http", {
			plugins: { pagination: { limit: 100 }, socketTimeout: 5000 },
		});

		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({
			error: () => {},
			info: () => {},
			warn: () => {},
		});

		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(context.configuration)
			.whenTagged("plugin", "api-http");

		context.server = context.app.resolve(Server);
	});

	it("baseName should be 'Public API'", ({ server }) => {
		assert.is((server as any).baseName(), "Public API");
	});

	it("pluginConfiguration should return the injected api-http configuration", ({ server, configuration }) => {
		assert.is((server as any).pluginConfiguration(), configuration);
	});

	it("defaultOptions should strip trailing slash on the router", ({ server }) => {
		const options = (server as any).defaultOptions();

		assert.equal(options.router, { stripTrailingSlash: true });
	});

	it("defaultOptions should expose the pagination limit as validation context", ({ server }) => {
		const options = (server as any).defaultOptions();

		assert.equal(options.routes.validate.options.context, {
			configuration: {
				plugins: {
					pagination: { limit: 100 },
				},
			},
		});
	});

	it("defaultOptions should map payload and validation errors to 422 bad data", async ({ server }) => {
		const options = (server as any).defaultOptions();

		// The payload failAction is unreachable over HTTP (all routes are GET),
		// but hapi still requires it for payload parsing errors.
		const payloadResult = await options.routes.payload.failAction(undefined, undefined, new Error("payload broke"));
		assert.true(payloadResult.isBoom);
		assert.is(payloadResult.output.statusCode, 422);
		assert.is(payloadResult.output.payload.message, "payload broke");

		const validateResult = await options.routes.validate.failAction(
			undefined,
			undefined,
			new Error("validation broke"),
		);
		assert.true(validateResult.isBoom);
		assert.is(validateResult.output.statusCode, 422);
		assert.is(validateResult.output.payload.message, "validation broke");
	});
});
