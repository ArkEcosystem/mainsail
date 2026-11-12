import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { CloseReason, ConnectionError } from "@mainsail/p2p-websocket";
import { describe } from "@mainsail/test-runner";

import { PeerDisposer } from "./peer-disposer";

describe<{
	disposer: PeerDisposer;
	repository: any;
	websocketService: any;
	logger: any;
}>("PeerDisposer", ({ it, assert, beforeEach, spy, clock }) => {
	beforeEach((context) => {
		context.repository = {
			demotePeer: () => {},
			getActivePeers: () => [],
			getPendingPeers: () => [],
			hasActivePeer: () => true,
			hasPendingPeer: () => false,
			removePeer: () => {},
		};
		context.websocketService = {
			ban: () => {},
			bans: () => [],
			disconnect: async () => {},
			isBanned: () => false,
		};
		context.logger = { debug: () => {} };

		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: () => 3 })
			.whenTagged("plugin", "p2p-service");
		app.bind(Identifiers.P2P.WebSocket.Service).toConstantValue(context.websocketService);
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		context.disposer = app.resolve(PeerDisposer);
	});

	it("#banPeer - should only dispose the peer when the connection failed", ({
		disposer,
		repository,
		websocketService,
	}) => {
		const ban = spy(websocketService, "ban");
		const disconnect = spy(websocketService, "disconnect");
		const demotePeer = spy(repository, "demotePeer");

		for (const reason of [CloseReason.LocalClose, CloseReason.RequestTimeout, CloseReason.HeartbeatTimeout]) {
			disposer.banPeer("1.1.1.1", new ConnectionError(reason, "gone"));
		}

		ban.neverCalled();
		disconnect.calledTimes(3);
		demotePeer.calledTimes(3);
	});

	it("#banPeer - should ignore a connection failure of a peer that is neither active nor pending", ({
		disposer,
		repository,
		websocketService,
		logger,
	}) => {
		repository.hasActivePeer = () => false;
		const disconnect = spy(websocketService, "disconnect");
		const debug = spy(logger, "debug");

		disposer.banPeer("1.1.1.1", new ConnectionError(CloseReason.LocalClose, "gone"));

		disconnect.neverCalled();
		debug.neverCalled();
	});

	it("#banPeer - should ban and forget the peer for any other error", ({
		disposer,
		repository,
		websocketService,
	}) => {
		const fakeTimers = clock({ now: 1_000_000, toFake: ["Date"] });
		const ban = spy(websocketService, "ban");
		const disconnect = spy(websocketService, "disconnect");
		const removePeer = spy(repository, "removePeer");

		disposer.banPeer("1.1.1.1", new Error("bad block"));

		ban.calledWith("1.1.1.1", 1_000_000 + 3 * 60 * 1000);
		disconnect.calledOnce();
		removePeer.calledWith("1.1.1.1");

		fakeTimers.restore();
	});

	it("#banPeer - should not ban a peer twice", ({ disposer, websocketService }) => {
		websocketService.isBanned = () => true;
		const ban = spy(websocketService, "ban");

		disposer.banPeer("1.1.1.1", new Error("bad block"));

		ban.neverCalled();
	});
});
