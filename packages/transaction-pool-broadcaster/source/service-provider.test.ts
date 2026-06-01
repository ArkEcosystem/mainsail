import { Identifiers } from "@mainsail/constants";
import { Application, Providers } from "@mainsail/kernel";
import Joi from "joi";

import { describe } from "@mainsail/test-runner";
import { defaults } from "./defaults";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("#register - should bind the broadcaster services as singletons", async ({ app, serviceProvider }) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.TransactionPool.Peer.Repository));
		assert.true(app.isBound(Identifiers.TransactionPool.Peer.Communicator));
		assert.true(app.isBound(Identifiers.TransactionPool.Broadcaster));
		assert.true(app.isBound(Identifiers.TransactionPool.Peer.Factory));

		app.bind(Identifiers.Services.Log.Service).toConstantValue({ debug: () => {} });
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: () => 0 })
			.whenTagged("plugin", "transaction-pool-broadcaster");

		assert.equal(
			app.get(Identifiers.TransactionPool.Broadcaster),
			app.get(Identifiers.TransactionPool.Broadcaster),
		);
	});

	it("#register - the peer factory should build a peer with the configured port", async ({
		app,
		serviceProvider,
	}) => {
		serviceProvider.setConfig(
			new Providers.PluginConfiguration().from("transaction-pool-broadcaster", { txPoolPort: 1234 }),
		);

		await serviceProvider.register();

		const factory = app.get<(ip: string) => any>(Identifiers.TransactionPool.Peer.Factory);
		const peer = factory("1.2.3.4");

		assert.equal(peer.ip, "1.2.3.4");
		assert.equal(peer.port, 1234);
		assert.equal(peer.url, "http://1.2.3.4:1234");
	});

	it("#required - should be required", async ({ serviceProvider }) => {
		assert.true(await serviceProvider.required());
	});

	it("#configSchema - should validate the defaults", ({ serviceProvider }) => {
		const result = (serviceProvider.configSchema() as Joi.AnySchema).validate(defaults);

		assert.undefined(result.error);
		assert.number(result.value.maxPeersBroadcast);
		assert.number(result.value.maxSequentialErrors);
		assert.number(result.value.txPoolPort);
	});

	it("#configSchema - should allow unknown fields", ({ serviceProvider }) => {
		const result = (serviceProvider.configSchema() as Joi.AnySchema).validate({ ...defaults, custom: "value" });

		assert.undefined(result.error);
		assert.equal(result.value.custom, "value");
	});

	it("#configSchema - should require maxPeersBroadcast", ({ serviceProvider }) => {
		const { maxPeersBroadcast, ...rest } = defaults;

		const result = (serviceProvider.configSchema() as Joi.AnySchema).validate(rest);

		assert.defined(result.error);
	});

	it("#configSchema - should reject negative values", ({ serviceProvider }) => {
		const result = (serviceProvider.configSchema() as Joi.AnySchema).validate({
			...defaults,
			maxPeersBroadcast: -1,
		});

		assert.defined(result.error);
	});
});
