import { Server } from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ValidateIpPlugin } from "./validate-ip";

describe<{
	app: Application;
	validateIpPlugin: ValidateIpPlugin;
	peerDisposer: {
		banPeer: (ip: string, error: Error) => void;
		disposePeer: (ip: string) => void;
		isBanned: (ip: string) => boolean;
	};
	peerProcessor: { validatePeerIp: (ip: string) => boolean };
	peerRepository: { hasPeer: (ip: string) => boolean };
	server: Server;
}>("ValidateIpPlugin", ({ it, assert, beforeEach, spy }) => {
	const responsePayload = { status: "ok" };

	beforeEach((context) => {
		context.app = new Application();

		context.peerDisposer = { banPeer: () => {}, disposePeer: () => {}, isBanned: () => false };
		context.peerProcessor = { validatePeerIp: () => true };
		context.peerRepository = { hasPeer: () => false };

		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: () => false })
			.whenTagged("plugin", "p2p");
		context.app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(context.peerDisposer);
		context.app.bind(Identifiers.P2P.Peer.Processor).toConstantValue(context.peerProcessor);
		context.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.peerRepository);

		context.validateIpPlugin = context.app.resolve(ValidateIpPlugin);

		const controller = { handle: () => responsePayload };
		context.server = new Server({ port: 4104 });
		context.server.bind(controller);
		context.server.route({
			method: "POST",
			options: { handler: controller.handle.bind(controller) },
			path: "/p2p/peer/mockroute",
		});

		context.validateIpPlugin.register(context.server);
	});

	const inject = (server: Server) => server.inject({ method: "POST", payload: {}, url: "/p2p/peer/mockroute" });

	it("should serve a request from an ip that passes the acceptance policy", async ({ server, peerDisposer }) => {
		const disposePeer = spy(peerDisposer, "disposePeer");

		const response = await inject(server);

		assert.equal(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload), responsePayload);
		disposePeer.neverCalled();
	});

	it("should serve a request from an accepted peer without re-applying the acceptance policy", async ({
		server,
		peerDisposer,
		peerProcessor,
		peerRepository,
	}) => {
		// A known peer whose /24 subnet has meanwhile reached the limit.
		peerRepository.hasPeer = () => true;
		peerProcessor.validatePeerIp = () => false;
		const validatePeerIp = spy(peerProcessor, "validatePeerIp");
		const disposePeer = spy(peerDisposer, "disposePeer");

		const response = await inject(server);

		assert.equal(response.statusCode, 200);
		validatePeerIp.neverCalled();
		disposePeer.neverCalled();
	});

	it("should dispose an unknown ip that fails the acceptance policy", async ({
		server,
		peerDisposer,
		peerProcessor,
	}) => {
		peerProcessor.validatePeerIp = () => false;
		const disposePeer = spy(peerDisposer, "disposePeer");

		const response = await inject(server);

		assert.equal(response.statusCode, 400);
		disposePeer.calledWith("127.0.0.1");
	});

	it("should reject a banned ip even when it is a known peer", async ({ server, peerDisposer, peerRepository }) => {
		peerRepository.hasPeer = () => true;
		peerDisposer.isBanned = () => true;
		const banPeer = spy(peerDisposer, "banPeer");

		const response = await inject(server);

		assert.equal(response.statusCode, 400);
		banPeer.calledOnce();
	});
});
