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
	const configuration: any = {};

	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue(configuration);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(eventDispatcher);

		context.peerRepository = context.app.resolve(PeerRepository);
	});

	it("#getActivePeers - should return all the peers in an array", ({ peerRepository, app }) => {
		const peers = [
			app.resolve(Peer).init("176.165.66.55", 4000),
			app.resolve(Peer).init("176.165.44.33", 4000),
			app.resolve(Peer).init("2001:3984:3989::104", 4000),
		];

		for (const peer of peers) {
			peerRepository.setActivePeer(peer);
		}

		assert.equal(peerRepository.getActivePeers(), peers);
	});

	it("#getActivePeer - should return the peer by its ip", ({ peerRepository, app }) => {
		const peersByIp = {
			"176.165.44.33": app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};

		for (const peerIp of Object.values(peersByIp)) {
			peerRepository.setActivePeer(peerIp);
		}

		for (const [ip, peer] of Object.entries(peersByIp)) {
			assert.equal(peerRepository.getActivePeer(ip), peer);
		}
	});

	it("#getActivePeer - should throw when no peer exists for the ip", ({ peerRepository, app }) => {
		const peersByIp = {
			"176.165.44.33": app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};

		for (const peerIp of Object.values(peersByIp)) {
			peerRepository.setActivePeer(peerIp);
		}

		assert.throws(() => peerRepository.getActivePeer("127.0.0.1"));
	});

	it("#setActivePeer - should set the peer by its ip", ({ peerRepository, app }) => {
		const peersByIp = {
			"176.165.44.33": app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};

		for (const peer of Object.values(peersByIp)) {
			peerRepository.setActivePeer(peer);
		}

		for (const [ip, peer] of Object.entries(peersByIp)) {
			assert.equal(peerRepository.getActivePeer(ip), peer);
		}
	});

	it("#hasActivePeer - should return true if the peer exists", ({ peerRepository, app }) => {
		const peer = app.resolve(Peer).init("176.165.66.55", 4000);

		peerRepository.setActivePeer(peer);

		assert.true(peerRepository.hasActivePeer(peer.ip));
	});

	it("#hasActivePeer - should return false if the peer does not exist", ({ peerRepository }) => {
		assert.false(peerRepository.hasActivePeer("176.165.66.55"));
	});

	it("#getPendingPeers - should return the pending peers", ({ peerRepository, app }) => {
		const peers = [app.resolve(Peer).init("176.165.66.55", 4000), app.resolve(Peer).init("176.165.44.33", 4000)];

		for (const peer of peers) {
			peerRepository.setPendingPeer(peer);
		}

		assert.equal(peerRepository.getPendingPeers(), peers);
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
		for (const ip of Object.keys(peersByIp)) {
			assert.true(peerRepository.hasPendingPeer(ip));
		}
		assert.equal(peerRepository.getPendingPeers(), Object.values(peersByIp));
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
			peerRepository.setActivePeer(peer);
		}

		assert.equal(peerRepository.getSameSubnetPeers("176.165.66.10").length, 2);
		assert.equal(peerRepository.getSameSubnetPeers("176.165.22.99").length, 1);
		assert.equal(peerRepository.getSameSubnetPeers("176.165.23.10").length, 0);
	});

	it("#getPeer - should return the peer from whichever list holds it", ({ peerRepository, app }) => {
		const active = app.resolve(Peer).init("176.165.66.55", 4000);
		const pending = app.resolve(Peer).init("176.165.44.33", 4000);
		const known = app.resolve(Peer).init("176.165.22.11", 4000);

		peerRepository.setActivePeer(active);
		peerRepository.setPendingPeer(pending);
		peerRepository.setKnownPeer(known);

		assert.equal(peerRepository.getPeer(active.ip), active);
		assert.equal(peerRepository.getPeer(pending.ip), pending);
		assert.equal(peerRepository.getPeer(known.ip), known);
		assert.throws(() => peerRepository.getPeer("1.1.1.1"));
	});

	it("#getPeer - should prefer the pending entry of an address that is also known", ({ peerRepository, app }) => {
		// A reconnecting peer: the known entry stays while a new object for the address is verified.
		const known = app.resolve(Peer).init("176.165.22.11", 4000);
		const pending = app.resolve(Peer).init("176.165.22.11", 4000);
		pending.version = "0.0.2";

		peerRepository.setKnownPeer(known);
		peerRepository.setPendingPeer(pending);

		assert.equal(peerRepository.getPeer("176.165.22.11").version, "0.0.2");
	});

	it("#removePeer - should remove the peer from every list", ({ peerRepository, app }) => {
		const active = app.resolve(Peer).init("176.165.66.55", 4000);
		const pending = app.resolve(Peer).init("176.165.44.33", 4000);
		const known = app.resolve(Peer).init("176.165.22.11", 4000);
		peerRepository.setActivePeer(active);
		peerRepository.setPendingPeer(pending);
		peerRepository.setKnownPeer(known);

		peerRepository.removePeer(active.ip);
		peerRepository.removePeer(pending.ip);
		peerRepository.removePeer(known.ip);
		peerRepository.removePeer("1.1.1.1");

		assert.false(peerRepository.hasActivePeer(active.ip));
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

		peerRepository.setActivePeer(active);
		dispatch.calledWith(Events.PeerEvent.Added, active);

		peerRepository.setPendingPeer(pending);
		peerRepository.setKnownPeer(known);
		peerRepository.removePeer(pending.ip);
		peerRepository.removePeer(known.ip);
		dispatch.calledOnce();

		peerRepository.removePeer(active.ip);
		dispatch.calledWith(Events.PeerEvent.Removed, active);
		dispatch.calledTimes(2);

		// Removing a peer that is not active announces nothing.
		peerRepository.removePeer(active.ip);
		dispatch.calledTimes(2);
	});

	it("#hasMinimumPeers - should compare the active peers with the minimum network reach", ({
		peerRepository,
		app,
	}) => {
		configuration.getRequired = () => 1;
		assert.false(peerRepository.hasMinimumPeers());

		// Pending and known peers do not count.
		peerRepository.setPendingPeer(app.resolve(Peer).init("176.165.44.33", 4000));
		peerRepository.setKnownPeer(app.resolve(Peer).init("176.165.22.11", 4000));
		assert.false(peerRepository.hasMinimumPeers());

		peerRepository.setActivePeer(app.resolve(Peer).init("176.165.66.55", 4000));
		assert.true(peerRepository.hasMinimumPeers());
	});

	it("#hasMinimumPeers - should always hold with a minimum network reach of 0", ({ peerRepository }) => {
		configuration.getRequired = () => 0;

		assert.true(peerRepository.hasMinimumPeers());
	});

	it("#demotePeer - should turn an active peer into a known one and drop a pending one", ({
		peerRepository,
		app,
	}) => {
		const active = app.resolve(Peer).init("176.165.66.55", 4000);
		const pending = app.resolve(Peer).init("176.165.44.33", 4000);
		peerRepository.setActivePeer(active);
		peerRepository.setPendingPeer(pending);

		peerRepository.demotePeer(active.ip);
		assert.false(peerRepository.hasActivePeer(active.ip));
		assert.equal(peerRepository.getKnownPeer(active.ip), active);

		peerRepository.demotePeer(pending.ip);
		assert.false(peerRepository.hasPendingPeer(pending.ip));
		assert.false(peerRepository.hasKnownPeer(pending.ip));

		// Unknown or already known addresses are left alone.
		peerRepository.demotePeer("1.1.1.1");
		peerRepository.demotePeer(active.ip);
		assert.equal(peerRepository.getKnownPeers(), [active]);
	});

	it("#setActivePeer - should take the peer off the pending and known lists", ({ peerRepository, app }) => {
		const peer = app.resolve(Peer).init("176.165.66.55", 4000);
		peerRepository.setKnownPeer(peer);
		peerRepository.setPendingPeer(peer);

		peerRepository.setActivePeer(peer);

		assert.equal(peerRepository.getActivePeer(peer.ip), peer);
		assert.false(peerRepository.hasPendingPeer(peer.ip));
		assert.false(peerRepository.hasKnownPeer(peer.ip));
	});

	it("should keep a known peer known while it is pending", ({ peerRepository, app }) => {
		const demoted = app.resolve(Peer).init("176.165.66.55", 4000);
		const removed = app.resolve(Peer).init("176.165.44.33", 4000);
		for (const peer of [demoted, removed]) {
			peerRepository.setKnownPeer(peer);
			peerRepository.setPendingPeer(peer);
		}

		peerRepository.demotePeer(demoted.ip);
		assert.false(peerRepository.hasPendingPeer(demoted.ip));
		assert.equal(peerRepository.getKnownPeer(demoted.ip), demoted);

		peerRepository.removePeer(removed.ip);
		assert.false(peerRepository.hasPeer(removed.ip));
	});
});
