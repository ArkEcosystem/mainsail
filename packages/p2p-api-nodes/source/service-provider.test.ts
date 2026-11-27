import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ApiNodeRepository } from "./api-node-repository";
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

	it("#register - should bind the api node services", async ({ app, serviceProvider }) => {
		await serviceProvider.register();

		for (const identifier of [
			Identifiers.P2P.ApiNode.Factory,
			Identifiers.P2P.ApiNode.Repository,
			Identifiers.P2P.ApiNode.Verifier,
			Identifiers.P2P.ApiNode.Processor,
			Identifiers.P2P.ApiNode.Discoverer,
			Identifiers.P2P.ApiNode.Service,
		]) {
			assert.true(app.isBound(identifier));
		}

		assert.instance(app.get(Identifiers.P2P.ApiNode.Repository), ApiNodeRepository);
	});

	it("#register - should make api nodes with a normalized url", async ({ app, serviceProvider }) => {
		await serviceProvider.register();

		const apiNodeFactory = app.get<(url: string) => { url: string }>(Identifiers.P2P.ApiNode.Factory);

		assert.equal(apiNodeFactory("http://user:pw@1.2.3.4:4003/api/?a=1#b").url, "http://1.2.3.4:4003/api");
		assert.throws(() => apiNodeFactory("ftp://1.2.3.4/"));
	});

	it("#boot and #dispose - should start and stop the service", async ({ app, serviceProvider }) => {
		const service = { boot: () => {}, dispose: () => {} };
		const boot = spy(service, "boot");
		const dispose = spy(service, "dispose");
		app.bind(Identifiers.P2P.ApiNode.Service).toConstantValue(service);

		await serviceProvider.boot();
		boot.calledOnce();

		await serviceProvider.dispose();
		dispose.calledOnce();
	});

	it("#configSchema - should accept the defaults", ({ serviceProvider }) => {
		assert.undefined(serviceProvider.configSchema().validate(defaults).error);
	});

	it("#configSchema - should accept http(s) urls only", ({ serviceProvider }) => {
		const schema = serviceProvider.configSchema();

		assert.undefined(schema.validate({ ...defaults, apiNodes: ["https://api.example.com"] }).error);
		assert.defined(schema.validate({ ...defaults, apiNodes: ["ftp://api.example.com"] }).error);
		assert.defined(schema.validate({ ...defaults, apiNodesMaxContentLength: -1 }).error);
	});
});
