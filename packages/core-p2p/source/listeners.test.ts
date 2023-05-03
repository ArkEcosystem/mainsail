import { Identifiers } from "@mainsail/core-contracts";
import { describe, Sandbox } from "../../core-test-framework";

import { DisconnectInvalidPeers, DisconnectPeer } from "./listeners";
import { Peer } from "./peer";

describe<{
	sandbox: Sandbox;
	disconnectPeer: DisconnectPeer;
}>("DisconnectPeer", ({ it, beforeEach, spy }) => {
	const connector = { disconnect: () => {} };
	const repository = { forgetPeer: () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.PeerConnector).toConstantValue(connector);
		context.sandbox.app.bind(Identifiers.PeerRepository).toConstantValue(repository);

		context.disconnectPeer = context.sandbox.app.resolve(DisconnectPeer);
	});

	it("#handle - should disconnect the peer provided", async ({ disconnectPeer }) => {
		const spyForgetPeer = spy(repository, "forgetPeer");
		const spyDisconnect = spy(connector, "disconnect");

		const peer = new Peer("187.176.1.1", 4000);
		await disconnectPeer.handle({ data: { peer: peer, port: 4000 } });

		spyForgetPeer.calledOnce();
		spyForgetPeer.calledWith(peer);
		spyDisconnect.calledOnce();
		spyDisconnect.calledWith(peer);
	});
});

describe<{
	sandbox: Sandbox;
	disconnectInvalidPeers: DisconnectInvalidPeers;
}>("DisconnectInvalidPeers", ({ it, beforeEach, spy, stub }) => {
	const repository = { getPeers: () => {} };
	const dispatcher = { dispatch: () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.EventDispatcherService).toConstantValue(dispatcher);
		context.sandbox.app.bind(Identifiers.PeerRepository).toConstantValue(repository);

		context.disconnectInvalidPeers = context.sandbox.app.resolve(DisconnectInvalidPeers);
	});

	it("#handle - should emit 'internal.p2p.disconnectPeer' for invalid version peers", async ({
		disconnectInvalidPeers,
	}) => {
		// Versions are not set
		const peers = [new Peer("180.177.54.4", 4000), new Peer("181.177.54.4", 4000)];

		stub(repository, "getPeers").returnValue(peers);

		const spyDispatch = spy(dispatcher, "dispatch");

		await disconnectInvalidPeers.handle();

		spyDispatch.calledTimes(2); // 2 invalid peers version
	});
});
