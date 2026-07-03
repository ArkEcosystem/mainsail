import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import Handlers from "./handlers";

describe<{
	app: Application;
	routes: any[];
	server: any;
}>("Handlers", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({
				getRequired: (key: string) => ({ maxTransactionBytes: 1024, maxTransactionsPerRequest: 2 })[key],
			})
			.whenTagged("plugin", "transaction-pool-service");
		context.app.bind(Identifiers.TransactionPool.Processor).toConstantValue({});
		context.app.bind(Identifiers.TransactionPool.Query).toConstantValue({});
		context.app.bind(Identifiers.State.Store).toConstantValue({});

		context.routes = [];
		context.server = {
			app: { app: context.app },
			bind: () => {},
			route: (route: object) => context.routes.push(route),
		};
	});

	it("exposes the plugin name and version", () => {
		assert.equal(Handlers.name, "Transaction Pool API");
		assert.equal(Handlers.version, "2.0.0");
	});

	it("registers the configuration and transaction routes", async ({ server, routes }) => {
		await Handlers.register(server);

		assert.equal(
			routes.map((route) => `${route.method} ${route.path}`),
			[
				"GET /configuration",
				"POST /transactions",
				"GET /transactions/unconfirmed",
				"GET /transactions/unconfirmed/{hash}",
			],
		);
	});

	it("derives the post payload limit from the pool configuration", async ({ server, routes }) => {
		await Handlers.register(server);

		const store = routes.find((route) => route.method === "POST");

		assert.equal(store.options.payload.maxBytes, 100 + 2 * (1024 * 2 + 4));
	});
});
