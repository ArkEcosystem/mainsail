import { Server } from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { Providers } from "@mainsail/kernel";

import { Application } from "@mainsail/kernel";
import { Container } from "@mainsail/container";
import { describe } from "@mainsail/test-runner";
import { defaults as transactionPoolDefaults } from "../../../../transaction-pool-service/source/defaults";
import { defaults } from "../../defaults";
import { AcceptPeerPlugin } from "./accept-peer";

describe<{
	app: Application;
	acceptPeerPlugin: AcceptPeerPlugin;
}>("AcceptPeerPlugin", ({ it, assert, beforeEach, spy, match }) => {
	const logger = { debug: () => {}, warn: () => {} };
	const peerProcessor = { validateAndAcceptPeer: () => {} };

	beforeEach((context) => {
		context.app = new Application(new Container());

		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(new Providers.PluginConfiguration().from("", defaults))
			.whenTagged("plugin", "p2p");
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(new Providers.PluginConfiguration().from("", transactionPoolDefaults))
			.whenTagged("plugin", "transaction-pool-service");
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(logger);
		context.app.bind(Identifiers.P2P.Peer.Processor).toConstantValue(peerProcessor);
		context.app.bind(Identifiers.Database.Service).toConstantValue({});
		context.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Block.Deserializer).toConstantValue({});
		context.app.bind(Identifiers.TransactionPool.Processor).toConstantValue({});
		context.app.bind(Identifiers.State.Store).toConstantValue({});

		context.acceptPeerPlugin = context.app.resolve<AcceptPeerPlugin>(AcceptPeerPlugin);
	});

	it("should register the validate plugin", async ({ acceptPeerPlugin }) => {
		const responsePayload = { status: "ok" };
		const routeByPath = {
			"/p2p/peer/mockroute": {
				handler: () => responsePayload,
				id: "p2p.peer.getPeers",
			},
		};
		const route = {
			config: {
				handler: routeByPath["/p2p/peer/mockroute"].handler,
				id: routeByPath["/p2p/peer/mockroute"].id,
			},
			method: "POST",
			path: "/p2p/peer/mockroute",
		};

		const server = new Server({ port: 4100 });
		server.route(route);

		const spyExtension = spy(server, "ext");
		const spyPeerProcessor = spy(peerProcessor, "validateAndAcceptPeer");

		acceptPeerPlugin.register(server);

		spyExtension.calledOnce();
		spyExtension.calledWith(match.has("type", "onPreHandler"));

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
		spyPeerProcessor.calledOnce();
		spyPeerProcessor.calledWith(remoteAddress);
	});
});
