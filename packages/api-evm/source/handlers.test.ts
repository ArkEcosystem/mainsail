import { describe } from "@mainsail/test-runner";

import handlers from "./handlers.js";

describe<{
	routes: any[];
	server: any;
}>("Handlers", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.routes = [];
		context.server = {
			app: {
				rpc: { process: () => {} },
			},
			route(config: any) {
				context.routes.push(config);
			},
		};
	});

	it("should expose the plugin metadata", () => {
		assert.is(handlers.name, "EVM API Routes");
		assert.is(handlers.version, "1.0.0");
	});

	it("register should register the BaseRoute (POST /)", async ({ server, routes }) => {
		const route = spy(server, "route");

		await handlers.register(server);

		route.calledOnce();
		assert.length(routes, 1);
		assert.is(routes[0].method, "POST");
		assert.is(routes[0].path, "/");
	});
});
