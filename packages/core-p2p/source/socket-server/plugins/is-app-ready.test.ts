import { Identifiers } from "@mainsail/core-contracts";
import { describe, Sandbox } from "../../../../core-test-framework";
import { Server } from "@hapi/hapi";

import { protocol } from "../../hapi-nes/utils";
import { IsAppReadyPlugin } from "./is-app-ready";

describe<{
	sandbox: Sandbox;
	isAppReadyPlugin: IsAppReadyPlugin;
}>("IsAppReadyPlugin", ({ it, assert, beforeEach, spy, match, stub }) => {
	const blockchain = { isBooted: () => true };

	const responsePayload = { status: "ok" };
	const mockRouteByPath = {
		"/p2p/peer/mockroute": {
			handler: () => responsePayload,
			id: "p2p.peer.getPeers",
		},
	};
	const mockRoute = {
		config: {
			handler: mockRouteByPath["/p2p/peer/mockroute"].handler,
			id: mockRouteByPath["/p2p/peer/mockroute"].id,
		},
		method: "POST",
		path: "/p2p/peer/mockroute",
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.BlockchainService).toConstantValue(blockchain);

		context.isAppReadyPlugin = context.sandbox.app.resolve(IsAppReadyPlugin);
	});

	it("should register the plugin", async ({ isAppReadyPlugin }) => {
		const server = new Server({ port: 4100 });
		server.route(mockRoute);

		const spyExtension = spy(server, "ext");
		const spyBlockchainIsBooted = stub(blockchain, "isBooted").returnValue(true);

		isAppReadyPlugin.register(server);

		spyExtension.calledOnce();
		spyExtension.calledWith(match.has("type", "onPostAuth"));

		// try the route with a valid payload
		const remoteAddress = "187.166.55.44";
		const responseValid = await server.inject({
			method: "POST",
			payload: {},
			remoteAddress,
			url: "/p2p/peer/mockroute",
		});

		assert.equal(JSON.parse(responseValid.payload), responsePayload);
		assert.equal(responseValid.statusCode, 200);
		spyBlockchainIsBooted.calledOnce();
	});

	it("should return a forbidden error when blockchain service is not booted", async ({ isAppReadyPlugin }) => {
		const server = new Server({ port: 4100 });
		server.route(mockRoute);
		isAppReadyPlugin.register(server);

		const spyBlockchainIsBooted = stub(blockchain, "isBooted").returnValue(false);

		// try the route with a valid payload
		const remoteAddress = "187.166.55.44";
		const response = await server.inject({
			method: "POST",
			payload: {},
			remoteAddress,
			url: "/p2p/peer/mockroute",
		});

		assert.equal(response.statusCode, protocol.gracefulErrorStatusCode);
		spyBlockchainIsBooted.calledOnce();
	});
});
