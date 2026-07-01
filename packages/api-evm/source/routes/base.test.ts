import { Units } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import { BaseRoute } from "./base.js";

describe<{
	routes: any[];
	rpc: { process: (request: unknown) => unknown };
	server: any;
}>("BaseRoute", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.routes = [];
		context.rpc = {
			process: (request: unknown) => ({ processed: request }),
		};
		context.server = {
			app: {
				rpc: context.rpc,
			},
			route(config: any) {
				context.routes.push(config);
			},
		};
	});

	it("should register a single POST / route", ({ server, routes }) => {
		BaseRoute.register(server);

		assert.length(routes, 1);
		assert.is(routes[0].method, "POST");
		assert.is(routes[0].path, "/");
	});

	it("should set the payload maxBytes to 100 KILOBYTE", ({ server, routes }) => {
		BaseRoute.register(server);

		assert.is(routes[0].options.payload.maxBytes, 100 * Units.KILOBYTE);
	});

	it("should delegate the handler to server.app.rpc.process", ({ server, routes, rpc }) => {
		const process = spy(rpc, "process");

		BaseRoute.register(server);

		const request = { some: "request" };
		const result = routes[0].handler(request);

		process.calledOnce();
		process.calledWith(request);
		assert.equal(result, { processed: request });
	});
});
