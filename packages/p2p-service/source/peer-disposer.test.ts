import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { CloseReason, ConnectionError } from "@mainsail/p2p-websocket";
import { describe } from "@mainsail/test-runner";

import { PeerDisposer } from "./peer-disposer";

describe<{
	disposer: PeerDisposer;
	repository: any;
	websocketService: any;
	configuration: any;
	events: any;
}>("PeerDisposer", ({ it, assert, beforeEach, spy, clock }) => {
	// A peer as the disposer sees it: an address and its plain data.
	const makePeer = (ip: string, version?: string) => ({ ip, toData: () => ({ ip, version }) });

	beforeEach((context) => {
		context.repository = {
			demotePeer: () => {},
			getActivePeers: () => [],
			getPendingPeers: () => [],
			hasPeer: () => false,
			removePeer: () => {},
		};
		context.events = { dispatch: async () => {} };
		context.configuration = { getRequired: () => 3 };
		context.websocketService = {
			ban: () => {},
			bans: () => [],
			disconnect: async () => {},
			isBanned: () => false,
			terminate: () => {},
		};
		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(context.configuration)
			.whenTagged("plugin", "p2p-service");
		app.bind(Identifiers.P2P.WebSocket.Service).toConstantValue(context.websocketService);
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.P2P.Peer.Factory).toConstantValue((ip: string) => makePeer(ip));
		app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		app.bind(Identifiers.Services.Log.Service).toConstantValue({ debug: () => {} });

		context.disposer = app.resolve(PeerDisposer);
	});

	it("#banPeer - should ignore a failure of the connection itself", ({
		disposer,
		repository,
		websocketService,
		events,
	}) => {
		const ban = spy(websocketService, "ban");
		const disconnect = spy(websocketService, "disconnect");
		const demotePeer = spy(repository, "demotePeer");
		const dispatch = spy(events, "dispatch");

		for (const reason of [CloseReason.LocalClose, CloseReason.RequestTimeout, CloseReason.HeartbeatTimeout]) {
			disposer.banPeer("1.1.1.1", new ConnectionError(reason, "gone"));
		}

		ban.neverCalled();
		disconnect.neverCalled();
		demotePeer.neverCalled();
		dispatch.neverCalled();
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

	it("#banPeer - should still tear the connection down and forget the peer without a ban time", ({
		disposer,
		repository,
		websocketService,
		configuration,
		events,
	}) => {
		configuration.getRequired = () => 0;
		const ban = spy(websocketService, "ban");
		const terminate = spy(websocketService, "terminate");
		const removePeer = spy(repository, "removePeer");
		const dispatch = spy(events, "dispatch");

		disposer.banPeer("1.1.1.1", new Error("bad block"));

		ban.neverCalled();
		terminate.calledWith("1.1.1.1");
		removePeer.calledWith("1.1.1.1");
		// The address is only disconnected and may come back at once: that is no ban.
		dispatch.neverCalled();
	});

	it("#banPeer - should not ban an address again while it is banned", ({
		disposer,
		repository,
		websocketService,
		events,
	}) => {
		websocketService.isBanned = () => true;
		const ban = spy(websocketService, "ban");
		const removePeer = spy(repository, "removePeer");
		const dispatch = spy(events, "dispatch");

		disposer.banPeer("1.1.1.1", new Error("bad block"));

		ban.neverCalled();
		removePeer.neverCalled();
		dispatch.neverCalled();
	});

	it("#banPeer - should announce the ban with the reason and its end, before the peer is removed", ({
		disposer,
		repository,
		websocketService,
		events,
	}) => {
		const fakeTimers = clock({ now: 1_000_000, toFake: ["Date"] });
		repository.hasPeer = () => true;
		repository.getPeer = () => makePeer("1.1.1.1", "0.0.1");

		const order: string[] = [];
		websocketService.ban = () => order.push("ban");
		repository.removePeer = () => order.push("removePeer");
		let announced: unknown[] = [];
		events.dispatch = async (...arguments_: unknown[]) => {
			order.push("dispatch");
			announced = arguments_;
		};

		disposer.banPeer("1.1.1.1", new Error("bad block"));

		assert.equal(order, ["ban", "dispatch", "removePeer"]);
		assert.equal(announced, [
			Events.PeerEvent.Banned,
			{
				peer: { ip: "1.1.1.1", version: "0.0.1" },
				reason: "bad block",
				until: 1_000_000 + 3 * 60 * 1000,
			},
		]);

		fakeTimers.restore();
	});

	it("#banPeer - should describe an address we keep no peer for by a fresh one", ({ disposer, events }) => {
		let announced: { peer?: unknown } = {};
		events.dispatch = async (_: string, data: { peer: unknown }) => {
			announced = data;
		};

		disposer.banPeer("4.4.4.4", new Error("bad message"));

		assert.equal(announced.peer, { ip: "4.4.4.4", version: undefined });
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
