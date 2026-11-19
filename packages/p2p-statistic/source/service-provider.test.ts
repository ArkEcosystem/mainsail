import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { defaults } from "./defaults";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ it, assert, beforeEach, spy }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("#register - should bind the statistic services and a step on each side of the transport", async ({
		app,
		serviceProvider,
	}) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.P2P.Statistic.Service));
		assert.true(app.isBound(Identifiers.P2P.Statistic.Logger));
		assert.true(app.isBound(Identifiers.P2P.WebSocket.SendMiddleware));
		assert.true(app.isBound(Identifiers.P2P.WebSocket.ReceiveMiddleware));
	});

	it("#boot and #dispose - should start and stop the service", async ({ app, serviceProvider }) => {
		const service = { boot: () => {}, dispose: () => {} };
		const boot = spy(service, "boot");
		const dispose = spy(service, "dispose");
		app.bind(Identifiers.P2P.Statistic.Service).toConstantValue(service);

		await serviceProvider.boot();
		boot.calledOnce();

		await serviceProvider.dispose();
		dispose.calledOnce();
	});

	it("#configSchema - should accept the defaults", ({ serviceProvider }) => {
		assert.undefined(serviceProvider.configSchema().validate(defaults).error);
	});

	it("#configSchema - should reject values outside their range", ({ serviceProvider }) => {
		const schema = serviceProvider.configSchema();

		assert.defined(schema.validate({ ...defaults, maxTrackedPeers: 0 }).error);
		assert.defined(schema.validate({ ...defaults, maxTrackedRounds: 0 }).error);
		assert.defined(schema.validate({ ...defaults, verbosity: 4 }).error);
	});
});
