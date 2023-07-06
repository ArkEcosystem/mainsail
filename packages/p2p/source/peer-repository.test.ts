import { Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../test-framework";
import { Peer } from "./peer";
import { PeerRepository } from "./peer-repository";

describe<{
	sandbox: Sandbox;
	peerRepository: PeerRepository;
}>("PeerRepository", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.QueueFactory).toConstantValue({});
		context.sandbox.app.bind(Identifiers.PluginConfiguration).toConstantValue({});

		context.peerRepository = context.sandbox.app.resolve(PeerRepository);
	});

	it("#getPeers - should return all the peers in an array", ({ peerRepository, sandbox }) => {
		const peers = [
			sandbox.app.resolve(Peer).init("176.165.66.55", 4000),
			sandbox.app.resolve(Peer).init("176.165.44.33", 4000),
			sandbox.app.resolve(Peer).init("2001:3984:3989::104", 4000),
		];

		for (const peer of peers) {
			peerRepository.setPeer(peer);
		}

		assert.equal(peerRepository.getPeers(), peers);
	});

	it("#hasPeers - should return false if there is zero peer", ({ peerRepository }) => {
		assert.false(peerRepository.hasPeers());
	});

	it("#hasPeers - should return true if there is more than zero peer", ({ peerRepository, sandbox }) => {
		const peers = [
			sandbox.app.resolve(Peer).init("176.165.66.55", 4000),
			sandbox.app.resolve(Peer).init("176.165.44.33", 4000),
			sandbox.app.resolve(Peer).init("176.165.22.11", 4000),
			sandbox.app.resolve(Peer).init("2001:3984:3989::104", 4000),
		];

		assert.false(peerRepository.hasPeers());

		for (const peer of peers) {
			peerRepository.setPeer(peer);
			assert.true(peerRepository.hasPeers());
		}
	});

	it("#getPeer - should return the peer by its ip", ({ peerRepository, sandbox }) => {
		const peersByIp = {
			"176.165.44.33": sandbox.app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": sandbox.app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": sandbox.app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};

		for (const peerIp of Object.values(peersByIp)) {
			peerRepository.setPeer(peerIp);
		}

		for (const [ip, peer] of Object.entries(peersByIp)) {
			assert.equal(peerRepository.getPeer(ip), peer);
		}
	});

	it("#getPeer - should throw when no peer exists for the ip", ({ peerRepository, sandbox }) => {
		const peersByIp = {
			"176.165.44.33": sandbox.app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": sandbox.app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": sandbox.app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};

		for (const peerIp of Object.values(peersByIp)) {
			peerRepository.setPeer(peerIp);
		}

		assert.throws(() => peerRepository.getPeer("127.0.0.1"));
	});

	it("#setPeer - should set the peer by its ip", ({ peerRepository, sandbox }) => {
		const peersByIp = {
			"176.165.44.33": sandbox.app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": sandbox.app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": sandbox.app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};

		for (const peer of Object.values(peersByIp)) {
			peerRepository.setPeer(peer);
		}

		for (const [ip, peer] of Object.entries(peersByIp)) {
			assert.equal(peerRepository.getPeer(ip), peer);
		}
	});

	it("#forgetPeer - should forget the peer", ({ peerRepository, sandbox }) => {
		const peer = sandbox.app.resolve(Peer).init("176.165.66.55", 4000);

		peerRepository.setPeer(peer);

		assert.true(peerRepository.hasPeer(peer.ip));
		assert.equal(peerRepository.getPeer(peer.ip), peer);

		peerRepository.forgetPeer(peer);

		assert.false(peerRepository.hasPeer(peer.ip));
		assert.throws(() => peerRepository.getPeer(peer.ip));
	});

	it("#hasPeer - should return true if the peer exists", ({ peerRepository, sandbox }) => {
		const peer = sandbox.app.resolve(Peer).init("176.165.66.55", 4000);

		peerRepository.setPeer(peer);

		assert.true(peerRepository.hasPeer(peer.ip));
	});

	it("#hasPeer - should return false if the peer does not exist", ({ peerRepository }) => {
		assert.false(peerRepository.hasPeer("176.165.66.55"));
	});

	it("#getPendingPeers - should return the pending peers", ({ peerRepository, sandbox }) => {
		const peers = [
			sandbox.app.resolve(Peer).init("176.165.66.55", 4000),
			sandbox.app.resolve(Peer).init("176.165.44.33", 4000),
		];

		for (const peer of peers) {
			peerRepository.setPendingPeer(peer);
		}

		assert.equal(peerRepository.getPendingPeers(), peers);
	});

	it("#hasPendingPeers - should return false if there is zero pending peer", ({ peerRepository }) => {
		assert.false(peerRepository.hasPendingPeers());
	});

	it("#hasPendingPeers - should return true if there is more than zero pending peer", ({
		peerRepository,
		sandbox,
	}) => {
		const peers = [
			sandbox.app.resolve(Peer).init("176.165.66.55", 4000),
			sandbox.app.resolve(Peer).init("176.165.44.33", 4000),
			sandbox.app.resolve(Peer).init("176.165.22.11", 4000),
			sandbox.app.resolve(Peer).init("2001:3984:3989::104", 4000),
		];

		assert.false(peerRepository.hasPendingPeers());

		for (const peer of peers) {
			peerRepository.setPendingPeer(peer);
			assert.true(peerRepository.hasPendingPeers());
		}
	});

	it("#getPendingPeer - should return the pending peer by its ip", ({ peerRepository, sandbox }) => {
		const peersByIp = {
			"176.165.44.33": sandbox.app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": sandbox.app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": sandbox.app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};
		for (const peer of Object.values(peersByIp)) {
			peerRepository.setPendingPeer(peer);
		}
		for (const [ip, peer] of Object.entries(peersByIp)) {
			assert.equal(peerRepository.getPendingPeer(ip), peer);
		}
	});

	it("#getPendingPeer - should throw when no pending peer exists for the ip", ({ peerRepository, sandbox }) => {
		const peersByIp = {
			"176.165.44.33": sandbox.app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": sandbox.app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": sandbox.app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};
		for (const peer of Object.values(peersByIp)) {
			peerRepository.setPendingPeer(peer);
		}

		assert.throws(() => peerRepository.getPendingPeer("127.0.0.1"));
	});

	it("#setPendingPeer - should set the pending peer by its ip", ({ peerRepository, sandbox }) => {
		const peersByIp = {
			"176.165.44.33": sandbox.app.resolve(Peer).init("176.165.44.33", 4000),
			"176.165.66.55": sandbox.app.resolve(Peer).init("176.165.66.55", 4000),
			"2001:3984:3989::104": sandbox.app.resolve(Peer).init("2001:3984:3989::104", 4000),
		};
		for (const peer of Object.values(peersByIp)) {
			peerRepository.setPendingPeer(peer);
		}
		for (const [ip, peer] of Object.entries(peersByIp)) {
			assert.equal(peerRepository.getPendingPeer(ip), peer);
		}
	});

	it("#forgetPendingPeer - should forget the pending peer", ({ peerRepository, sandbox }) => {
		const peer = sandbox.app.resolve(Peer).init("176.165.66.55", 4000);

		peerRepository.setPendingPeer(peer);

		assert.true(peerRepository.hasPendingPeer(peer.ip));
		assert.equal(peerRepository.getPendingPeer(peer.ip), peer);

		peerRepository.forgetPendingPeer(peer);

		assert.false(peerRepository.hasPendingPeer(peer.ip));
		assert.throws(() => peerRepository.getPendingPeer(peer.ip));
	});

	it("#hasPendingPeer - should return true if the pending peer exists", ({
		peerRepository: peerRepository,
		sandbox,
	}) => {
		const peer = sandbox.app.resolve(Peer).init("176.165.66.55", 4000);

		peerRepository.setPendingPeer(peer);

		assert.true(peerRepository.hasPendingPeer(peer.ip));
	});

	it("#hasPendingPeer - should return false if the pending peer does not exist", ({
		peerRepository: peerRepository,
	}) => {
		assert.false(peerRepository.hasPendingPeer("176.165.66.55"));
	});

	it("#getSameSubnetPeers - should get the peers within same subnet of provided ip", ({
		peerRepository: peerRepository,
		sandbox,
	}) => {
		const peers = [
			sandbox.app.resolve(Peer).init("176.165.66.55", 4000),
			sandbox.app.resolve(Peer).init("176.165.66.33", 4000),
			sandbox.app.resolve(Peer).init("176.165.22.11", 4000),
			sandbox.app.resolve(Peer).init("2001:3984:3989::104", 4000),
		];

		for (const peer of peers) {
			peerRepository.setPeer(peer);
		}

		assert.equal(peerRepository.getSameSubnetPeers("176.165.66.10").length, 2);
		assert.equal(peerRepository.getSameSubnetPeers("176.165.22.99").length, 1);
		assert.equal(peerRepository.getSameSubnetPeers("176.165.23.10").length, 0);
	});
});
