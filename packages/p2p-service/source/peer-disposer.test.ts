import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { CloseReason, ConnectionError } from "@mainsail/p2p-websocket";
import { describe } from "@mainsail/test-runner";

import { PeerDisposer } from "./peer-disposer";

describe<{
	disposer: PeerDisposer;
	repository: any;
	websocketService: any;
}>("PeerDisposer", ({ it, beforeEach, spy, clock }) => {
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
			terminate: () => {},
		};
		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: () => 3 })
			.whenTagged("plugin", "p2p-service");
		app.bind(Identifiers.P2P.WebSocket.Service).toConstantValue(context.websocketService);
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.Services.Log.Service).toConstantValue({ debug: () => {} });

		context.disposer = app.resolve(PeerDisposer);
	});

	it("#banPeer - should ignore a failure of the connection itself", ({ disposer, repository, websocketService }) => {
		const ban = spy(websocketService, "ban");
		const disconnect = spy(websocketService, "disconnect");
		const demotePeer = spy(repository, "demotePeer");

		for (const reason of [CloseReason.LocalClose, CloseReason.RequestTimeout, CloseReason.HeartbeatTimeout]) {
			disposer.banPeer("1.1.1.1", new ConnectionError(reason, "gone"));
		}

		ban.neverCalled();
		disconnect.neverCalled();
		demotePeer.neverCalled();
	});

	it("#banPeer - should ban and forget the peer for any other error", ({
		disposer,
		repository,
		websocketService,
	}) => {
		const fakeTimers = clock({ now: 1_000_000, toFake: ["Date"] });
		const ban = spy(websocketService, "ban");
		const removePeer = spy(repository, "removePeer");

		disposer.banPeer("1.1.1.1", new Error("bad block"));

		ban.calledWith("1.1.1.1", 1_000_000 + 3 * 60 * 1000);
		removePeer.calledWith("1.1.1.1");

		fakeTimers.restore();
	});

	it("#disposePeers - should tear every pending and active connection down at once", async ({
		disposer,
		repository,
		websocketService,
	}) => {
		repository.getPendingPeers = () => [{ ip: "1.1.1.1" }];
		repository.getActivePeers = () => [{ ip: "2.2.2.2" }, { ip: "3.3.3.3" }];
		const terminate = spy(websocketService, "terminate");
		const disconnect = spy(websocketService, "disconnect");

		await disposer.disposePeers();

		terminate.calledTimes(3);
		terminate.calledWith("1.1.1.1", CloseReason.Shutdown);
		terminate.calledWith("3.3.3.3", CloseReason.Shutdown);
		disconnect.neverCalled();
	});
});
