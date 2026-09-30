import { Server } from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { HeaderHandlePlugin } from "./header-handle";

describe<{
	app: Application;
	headerHandlePlugin: HeaderHandlePlugin;
	headerService: { handle: (peer: unknown, header: unknown) => Promise<void> };
	peerRepository: { getPeer: (ip: string) => unknown; hasPeer: (ip: string) => boolean };
	server: Server;
}>("HeaderHandlePlugin", ({ it, assert, beforeEach, spy }) => {
	const peer = { ip: "127.0.0.1" };
	const headers = { blockNumber: 3, round: 1 };
	const responsePayload = { status: "ok" };

	beforeEach((context) => {
		context.app = new Application();

		context.headerService = { handle: async () => {} };
		context.peerRepository = { getPeer: () => peer, hasPeer: () => true };

		context.app.bind(Identifiers.P2P.Header.Service).toConstantValue(context.headerService);
		context.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.peerRepository);

		context.headerHandlePlugin = context.app.resolve(HeaderHandlePlugin);

		// Wired like Server.initialize(): routes register first — each Route.register() calls
		// server.bind(controller), so that controller is what hapi hands to
		// extensions as `this` — and only then the plugin adds its extension.
		const controller = { handle: () => responsePayload };
		context.server = new Server({ port: 4103 });
		context.server.bind(controller);
		context.server.route({
			method: "POST",
			options: { handler: controller.handle.bind(controller) },
			path: "/p2p/peer/mockroute",
		});

		context.headerHandlePlugin.register(context.server);
	});

	it("should hand the request headers to the header service for a known peer", async ({
		server,
		headerService,
		peerRepository,
	}) => {
		const handle = spy(headerService, "handle");
		const hasPeer = spy(peerRepository, "hasPeer");

		const response = await server.inject({
			method: "POST",
			payload: { headers },
			url: "/p2p/peer/mockroute",
		});

		assert.equal(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload), responsePayload);
		hasPeer.calledWith("127.0.0.1");
		handle.calledOnce();
		handle.calledWith(peer, headers);
	});

	it("should not call the header service for an unknown peer", async ({ server, headerService, peerRepository }) => {
		peerRepository.hasPeer = () => false;
		const handle = spy(headerService, "handle");

		const response = await server.inject({
			method: "POST",
			payload: { headers },
			url: "/p2p/peer/mockroute",
		});

		assert.equal(response.statusCode, 200);
		handle.neverCalled();
	});
});
