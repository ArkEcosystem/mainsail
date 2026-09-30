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

		context.configuration = context.app.resolve(Providers.PluginConfiguration).from("api-transaction-pool", {
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
			.whenTagged("plugin", "api-transaction-pool");

		context.server = context.app.resolve(Server);
	});

	it("baseName should be 'Transaction Pool API'", ({ server }) => {
		assert.is((server as any).baseName(), "Transaction Pool API");
	});

	it("pluginConfiguration should return the injected api-transaction-pool configuration", ({
		server,
		configuration,
	}) => {
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
