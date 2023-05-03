import { Identifiers } from "@mainsail/core-contracts";
import { describe, Sandbox } from "../../../../core-test-framework";
import { Server } from "@hapi/hapi";

import { AwaitBlockPlugin } from "./await-block";

describe<{
	sandbox: Sandbox;
	awaitBlockPlugin: AwaitBlockPlugin;
}>("AwaitBlockPlugin", ({ it, assert, beforeEach, spy, match, stub }) => {
	const logger = { debug: () => {}, warning: () => {} };
	const peerProcessor = { validateAndAcceptPeer: () => {} };
	const stateStore = {
		getBlockchain: () => ({
			value: "newBlock",
		}),
	};
	const queue = {
		isRunning: () => true,
		once: () => {},
	};
	const blockchain = {
		getQueue: () => queue,
	};

	const responsePayload = { status: "ok" };
	const mockRouteByPath = {
		"/p2p/peer/mockroute_internal": {
			handler: () => responsePayload,
			id: "p2p.peer.getPeers",
		},
	};
	const mockRouteInternal = {
		config: {
			handler: mockRouteByPath["/p2p/peer/mockroute_internal"].handler,
			id: mockRouteByPath["/p2p/peer/mockroute_internal"].id,
		},
		method: "POST",
		path: "/p2p/peer/mockroute_internal",
	};

	const mockRoute = {
		config: {
			handler: mockRouteByPath["/p2p/peer/mockroute_internal"].handler,
			id: mockRouteByPath["/p2p/peer/mockroute_internal"].id,
		},
		method: "POST",
		path: "/p2p/peer/mockroute",
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(logger);
		context.sandbox.app.bind(Identifiers.PeerProcessor).toConstantValue(peerProcessor);
		context.sandbox.app.bind(Identifiers.StateStore).toConstantValue(stateStore);
		context.sandbox.app.bind(Identifiers.BlockchainService).toConstantValue(blockchain);

		context.awaitBlockPlugin = context.sandbox.app.resolve(AwaitBlockPlugin);
	});

	it("should continue if state !== newBlock", async ({ awaitBlockPlugin }) => {
		const server = new Server({ port: 4100 });
		server.route(mockRoute);

		const spyExtension = spy(server, "ext");
		const spyStateStoreGetBlockchain = stub(stateStore, "getBlockchain").returnValue({
			value: "syncing",
		});
		const spyQueueIsRunning = spy(queue, "isRunning");
		const spyQueueOnce = spy(queue, "once");

		awaitBlockPlugin.register(server);

		spyExtension.calledOnce();
		spyExtension.calledWith(match.has("type", "onPreAuth"));

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

		spyStateStoreGetBlockchain.calledOnce();

		spyQueueIsRunning.neverCalled();
		spyQueueOnce.neverCalled();
	});

	it("should continue if queue is not running", async ({ awaitBlockPlugin }) => {
		const server = new Server({ port: 4100 });
		server.route(mockRoute);

		const spyExtension = spy(server, "ext");
		const spyStateStoreGetBlockchain = stub(stateStore, "getBlockchain").returnValue({
			value: "newBlock",
		});
		const spyQueueIsRunning = stub(queue, "isRunning").returnValue(false);
		const spyQueueOnce = spy(queue, "once");

		awaitBlockPlugin.register(server);

		spyExtension.calledOnce();
		spyExtension.calledWith(match.has("type", "onPreAuth"));

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
		spyStateStoreGetBlockchain.calledOnce();

		spyQueueIsRunning.calledOnce();
		spyQueueOnce.neverCalled();
	});

	it("should await block processing", async ({ awaitBlockPlugin }) => {
		const server = new Server({ port: 4100 });
		server.route(mockRoute);
		awaitBlockPlugin.register(server);

		const spyStateStoreGetBlockchain = stub(stateStore, "getBlockchain").returnValue({
			value: "newBlock",
		});
		const spyQueueIsRunning = stub(queue, "isRunning").returnValue(true);
		const spyQueueOnce = stub(queue, "once").callsFake((event, callback) => {
			callback();
		});

		// try the route with a valid payload
		const remoteAddress = "187.166.55.44";
		const responseValid = await server.inject({
			method: "POST",
			url: "/p2p/peer/mockroute",
			payload: {},
			remoteAddress,
		});

		assert.equal(responseValid.statusCode, 200);
		spyStateStoreGetBlockchain.calledOnce();
		spyQueueIsRunning.calledOnce();
		spyQueueOnce.calledOnce();
	});
});
