import { Events, Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Peer } from "./peer";
import { PeerRepository } from "./peer-repository";

describe<{
	app: Application;
	peerRepository: PeerRepository;
}>("PeerRepository", ({ it, assert, beforeEach, spy }) => {
	const eventDispatcher = { dispatch: () => {}, listen: () => {} };

	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({});
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(eventDispatcher);

		context.peerRepository = context.app.resolve(PeerRepository);
	});

	it("#getPeers - should return all the peers in an array", ({ peerRepository, app }) => {
		const peers = [
			app.resolve(Peer).init("176.165.66.55", 4000),
			app.resolve(Peer).init("176.165.44.33", 4000),
			app.resolve(Peer).init("2001:3984:3989::104", 4000),
		];

		for (const peer of peers) {
			peerRepository.setPeer(peer);
		}

		assert.equal(peerRepository.getPeers(), peers);
	});

	it("#hasPeers - should return false if there is zero peer", ({ peerRepository }) => {
		assert.false(peerRepository.hasPeers());
	});

	it("#hasPeers - should return true if there is more than zero peer", ({ peerRepository, app }) => {
		const peers = [
			app.resolve(Peer).init("176.165.66.55", 4000),
			app.resolve(Peer).init("176.165.44.33", 4000),
			app.resolve(Peer).init("176.165.22.11", 4000),
			app.resolve(Peer).init("2001:3984:3989::104", 4000),
		];

		assert.false(peerRepository.hasPeers());

		for (const peer of peers) {
			peerRepository.setPeer(peer);
			assert.true(peerRepository.hasPeers());
		}
	});

	it("#getPeer - should return the peer by its ip", ({ peerRepository, app }) => {
		const peersByIp = {
			"176.165.44.33": app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};

		for (const peerIp of Object.values(peersByIp)) {
			peerRepository.setPeer(peerIp);
		}

		for (const [ip, peer] of Object.entries(peersByIp)) {
			assert.equal(peerRepository.getPeer(ip), peer);
		}
	});

	it("#getPeer - should throw when no peer exists for the ip", ({ peerRepository, app }) => {
		const peersByIp = {
			"176.165.44.33": app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};

		for (const peerIp of Object.values(peersByIp)) {
			peerRepository.setPeer(peerIp);
		}

		assert.throws(() => peerRepository.getPeer("127.0.0.1"));
	});

	it("#setPeer - should set the peer by its ip", ({ peerRepository, app }) => {
		const peersByIp = {
			"176.165.44.33": app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};

		for (const peer of Object.values(peersByIp)) {
			peerRepository.setPeer(peer);
		}

		for (const [ip, peer] of Object.entries(peersByIp)) {
			assert.equal(peerRepository.getPeer(ip), peer);
		}
	});

	it("#forgetPeer - should forget the peer", ({ peerRepository, app }) => {
		const peer = app.resolve(Peer).init("176.165.66.55", 4000);

		peerRepository.setPeer(peer);

		assert.true(peerRepository.hasPeer(peer.ip));
		assert.equal(peerRepository.getPeer(peer.ip), peer);

		peerRepository.forgetPeer(peer);

		assert.false(peerRepository.hasPeer(peer.ip));
		assert.throws(() => peerRepository.getPeer(peer.ip));
	});

	it("#hasPeer - should return true if the peer exists", ({ peerRepository, app }) => {
		const peer = app.resolve(Peer).init("176.165.66.55", 4000);

		peerRepository.setPeer(peer);

		assert.true(peerRepository.hasPeer(peer.ip));
	});

	it("#hasPeer - should return false if the peer does not exist", ({ peerRepository }) => {
		assert.false(peerRepository.hasPeer("176.165.66.55"));
	});

	it("#getPendingPeers - should return the pending peers", ({ peerRepository, app }) => {
		const peers = [app.resolve(Peer).init("176.165.66.55", 4000), app.resolve(Peer).init("176.165.44.33", 4000)];

		for (const peer of peers) {
			peerRepository.setPendingPeer(peer);
		}

		assert.equal(peerRepository.getPendingPeers(), peers);
	});

	it("#hasPendingPeers - should return false if there is zero pending peer", ({ peerRepository }) => {
		assert.false(peerRepository.hasPendingPeers());
	});

	it("#hasPendingPeers - should return true if there is more than zero pending peer", ({ peerRepository, app }) => {
		const peers = [
			app.resolve(Peer).init("176.165.66.55", 4000),
			app.resolve(Peer).init("176.165.44.33", 4000),
			app.resolve(Peer).init("176.165.22.11", 4000),
			app.resolve(Peer).init("2001:3984:3989::104", 4000),
		];

		assert.false(peerRepository.hasPendingPeers());

		for (const peer of peers) {
			peerRepository.setPendingPeer(peer);
			assert.true(peerRepository.hasPendingPeers());
		}
	});

	it("#getPendingPeer - should return the pending peer by its ip", ({ peerRepository, app }) => {
		const peersByIp = {
			"176.165.44.33": app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};
		for (const peer of Object.values(peersByIp)) {
			peerRepository.setPendingPeer(peer);
		}
		for (const [ip, peer] of Object.entries(peersByIp)) {
			assert.equal(peerRepository.getPendingPeer(ip), peer);
		}
	});

	it("#getPendingPeer - should throw when no pending peer exists for the ip", ({ peerRepository, app }) => {
		const peersByIp = {
			"176.165.44.33": app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};
		for (const peer of Object.values(peersByIp)) {
			peerRepository.setPendingPeer(peer);
		}

		assert.throws(() => peerRepository.getPendingPeer("127.0.0.1"));
	});

	it("#setPendingPeer - should set the pending peer by its ip", ({ peerRepository, app }) => {
		const peersByIp = {
			"176.165.44.33": app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};
		for (const peer of Object.values(peersByIp)) {
			peerRepository.setPendingPeer(peer);
		}
		for (const [ip, peer] of Object.entries(peersByIp)) {
			assert.equal(peerRepository.getPendingPeer(ip), peer);
		}
	});

	it("#forgetPendingPeer - should forget the pending peer", ({ peerRepository, app }) => {
		const peer = app.resolve(Peer).init("176.165.66.55", 4000);

		peerRepository.setPendingPeer(peer);

		assert.true(peerRepository.hasPendingPeer(peer.ip));
		assert.equal(peerRepository.getPendingPeer(peer.ip), peer);

		peerRepository.forgetPendingPeer(peer);

		assert.false(peerRepository.hasPendingPeer(peer.ip));
		assert.throws(() => peerRepository.getPendingPeer(peer.ip));
	});

	it("#hasPendingPeer - should return true if the pending peer exists", ({ peerRepository: peerRepository, app }) => {
		const peer = app.resolve(Peer).init("176.165.66.55", 4000);

		peerRepository.setPendingPeer(peer);

		assert.true(peerRepository.hasPendingPeer(peer.ip));
	});

	it("#hasPendingPeer - should return false if the pending peer does not exist", ({
		peerRepository: peerRepository,
	}) => {
		assert.false(peerRepository.hasPendingPeer("176.165.66.55"));
	});

	it("#getKnownPeers - should return the known peers", ({ peerRepository, app }) => {
		const peers = [app.resolve(Peer).init("176.165.66.55", 4000), app.resolve(Peer).init("176.165.44.33", 4000)];

		for (const peer of peers) {
			peerRepository.setKnownPeer(peer);
		}

		assert.equal(peerRepository.getKnownPeers(), peers);
	});

	it("#hasKnownPeers - should return false if there is zero known peer", ({ peerRepository }) => {
		assert.false(peerRepository.hasKnownPeers());
	});

	it("#hasKnownPeers - should return true if there is more than zero known peer", ({ peerRepository, app }) => {
		const peers = [
			app.resolve(Peer).init("176.165.66.55", 4000),
			app.resolve(Peer).init("176.165.44.33", 4000),
			app.resolve(Peer).init("176.165.22.11", 4000),
			app.resolve(Peer).init("2001:3984:3989::104", 4000),
		];

		assert.false(peerRepository.hasKnownPeers());

		for (const peer of peers) {
			peerRepository.setKnownPeer(peer);
			assert.true(peerRepository.hasKnownPeers());
		}
	});

	it("#getKnownPeer - should return the known peer by its ip", ({ peerRepository, app }) => {
		const peersByIp = {
			"176.165.44.33": app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};
		for (const peer of Object.values(peersByIp)) {
			peerRepository.setKnownPeer(peer);
		}
		for (const [ip, peer] of Object.entries(peersByIp)) {
			assert.equal(peerRepository.getKnownPeer(ip), peer);
		}
	});

	it("#getKnownPeer - should throw when no known peer exists for the ip", ({ peerRepository, app }) => {
		const peersByIp = {
			"176.165.44.33": app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};
		for (const peer of Object.values(peersByIp)) {
			peerRepository.setKnownPeer(peer);
		}

		assert.throws(() => peerRepository.getKnownPeer("127.0.0.1"));
	});

	it("#setKnownPeer - should set the known peer by its ip", ({ peerRepository, app }) => {
		const peersByIp = {
			"176.165.44.33": app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};
		for (const peer of Object.values(peersByIp)) {
			peerRepository.setKnownPeer(peer);
		}
		for (const [ip, peer] of Object.entries(peersByIp)) {
			assert.equal(peerRepository.getKnownPeer(ip), peer);
		}
	});

	it("#forgetKnownPeer - should forget the known peer", ({ peerRepository, app }) => {
		const peer = app.resolve(Peer).init("176.165.66.55", 4000);

		peerRepository.setKnownPeer(peer);

		assert.true(peerRepository.hasKnownPeer(peer.ip));
		assert.equal(peerRepository.getKnownPeer(peer.ip), peer);

		peerRepository.forgetKnownPeer(peer);

		assert.false(peerRepository.hasKnownPeer(peer.ip));
		assert.throws(() => peerRepository.getKnownPeer(peer.ip));
	});

	it("#hasKnownPeer - should return true if the known peer exists", ({ peerRepository: peerRepository, app }) => {
		const peer = app.resolve(Peer).init("176.165.66.55", 4000);

		peerRepository.setKnownPeer(peer);

		assert.true(peerRepository.hasKnownPeer(peer.ip));
	});

	it("#hasKnownPeer - should return false if the known peer does not exist", ({ peerRepository: peerRepository }) => {
		assert.false(peerRepository.hasKnownPeer("176.165.66.55"));
	});

	it("#getSameSubnetPeers - should get the peers within same subnet of provided ip", ({
		peerRepository: peerRepository,
		app,
	}) => {
		const peers = [
			app.resolve(Peer).init("176.165.66.55", 4000),
			app.resolve(Peer).init("176.165.66.33", 4000),
			app.resolve(Peer).init("176.165.22.11", 4000),
			app.resolve(Peer).init("2001:3984:3989::104", 4000),
		];

		for (const peer of peers) {
			peerRepository.setPeer(peer);
		}

		assert.equal(peerRepository.getSameSubnetPeers("176.165.66.10").length, 2);
		assert.equal(peerRepository.getSameSubnetPeers("176.165.22.99").length, 1);
		assert.equal(peerRepository.getSameSubnetPeers("176.165.23.10").length, 0);
	});

	it("#removePeer - should remove the peer from whichever list holds it", ({ peerRepository, app }) => {
		const active = app.resolve(Peer).init("176.165.66.55", 4000);
		const pending = app.resolve(Peer).init("176.165.44.33", 4000);
		const known = app.resolve(Peer).init("176.165.22.11", 4000);
		peerRepository.setPeer(active);
		peerRepository.setPendingPeer(pending);
		peerRepository.setKnownPeer(known);

		peerRepository.removePeer(active.ip);
		peerRepository.removePeer(pending.ip);
		peerRepository.removePeer(known.ip);
		peerRepository.removePeer("1.1.1.1");

		assert.false(peerRepository.hasPeer(active.ip));
		assert.false(peerRepository.hasPendingPeer(pending.ip));
		assert.false(peerRepository.hasKnownPeer(known.ip));
	});

	it("should announce active peers being set and forgotten, but not pending or known ones", ({
		peerRepository,
		app,
	}) => {
		const dispatch = spy(eventDispatcher, "dispatch");
		const active = app.resolve(Peer).init("176.165.66.55", 4000);
		const pending = app.resolve(Peer).init("176.165.44.33", 4000);
		const known = app.resolve(Peer).init("176.165.22.11", 4000);

		peerRepository.setPeer(active);
		dispatch.calledWith(Events.PeerEvent.Added, active);

		peerRepository.setPendingPeer(pending);
		peerRepository.setKnownPeer(known);
		peerRepository.removePeer(pending.ip);
		peerRepository.removePeer(known.ip);
		dispatch.calledOnce();

		peerRepository.removePeer(active.ip);
		dispatch.calledWith(Events.PeerEvent.Removed, active);
		dispatch.calledTimes(2);

		// Forgetting a peer that is not active announces nothing.
		peerRepository.forgetPeer(active);
		dispatch.calledTimes(2);
	});

	it("#demotePeer - should turn an active peer into a known one and drop a pending one", ({
		peerRepository,
		app,
	}) => {
		const active = app.resolve(Peer).init("176.165.66.55", 4000);
		const pending = app.resolve(Peer).init("176.165.44.33", 4000);
		peerRepository.setPeer(active);
		peerRepository.setPendingPeer(pending);

		peerRepository.demotePeer(active.ip);
		assert.false(peerRepository.hasPeer(active.ip));
		assert.equal(peerRepository.getKnownPeer(active.ip), active);

		peerRepository.demotePeer(pending.ip);
		assert.false(peerRepository.hasPendingPeer(pending.ip));
		assert.false(peerRepository.hasKnownPeer(pending.ip));

		// Unknown or already known addresses are left alone.
		peerRepository.demotePeer("1.1.1.1");
		peerRepository.demotePeer(active.ip);
		assert.equal(peerRepository.getKnownPeers(), [active]);
	});
});
