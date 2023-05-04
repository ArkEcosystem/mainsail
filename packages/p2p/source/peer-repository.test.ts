import { describe, Sandbox } from "../../core-test-framework";

import { Peer } from "./peer";
import { PeerRepository } from "./peer-repository";

describe<{
	sandbox: Sandbox;
	peerRepostiory: PeerRepository;
}>("PeerRepository", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.peerRepostiory = context.sandbox.app.resolve(PeerRepository);
	});

	it("#getPeers - should return all the peers in an array", ({ peerRepostiory }) => {
		const peers = [
			new Peer("176.165.66.55", 4000),
			new Peer("176.165.44.33", 4000),
			new Peer("2001:3984:3989::104", 4000),
		];

		for (const peer of peers) {
			peerRepostiory.setPeer(peer);
		}

		assert.equal(peerRepostiory.getPeers(), peers);
	});

	it("#hasPeers - should return false if there is zero peer", ({ peerRepostiory }) => {
		assert.false(peerRepostiory.hasPeers());
	});

	it("#hasPeers - should return true if there is more than zero peer", ({ peerRepostiory }) => {
		const peers = [
			new Peer("176.165.66.55", 4000),
			new Peer("176.165.44.33", 4000),
			new Peer("176.165.22.11", 4000),
			new Peer("2001:3984:3989::104", 4000),
		];

		assert.false(peerRepostiory.hasPeers());

		for (const peer of peers) {
			peerRepostiory.setPeer(peer);
			assert.true(peerRepostiory.hasPeers());
		}
	});

	it("#getPeer - should return the peer by its ip", ({ peerRepostiory }) => {
		const peersByIp = {
			"176.165.44.33": new Peer("176.165.44.33", 4000),
			"176.165.66.55": new Peer("176.165.66.55", 4000),
			"2001:3984:3989::104": new Peer("2001:3984:3989::104", 4000),
		};

		for (const peerIp of Object.values(peersByIp)) {
			peerRepostiory.setPeer(peerIp);
		}

		for (const [ip, peer] of Object.entries(peersByIp)) {
			assert.equal(peerRepostiory.getPeer(ip), peer);
		}
	});

	it("#getPeer - should throw when no peer exists for the ip", ({ peerRepostiory }) => {
		const peersByIp = {
			"176.165.44.33": new Peer("176.165.44.33", 4000),
			"176.165.66.55": new Peer("176.165.66.55", 4000),
			"2001:3984:3989::104": new Peer("2001:3984:3989::104", 4000),
		};

		for (const peerIp of Object.values(peersByIp)) {
			peerRepostiory.setPeer(peerIp);
		}

		assert.throws(() => peerRepostiory.getPeer("127.0.0.1"));
	});

	it("#setPeer - should set the peer by its ip", ({ peerRepostiory }) => {
		const peersByIp = {
			"176.165.44.33": new Peer("176.165.44.33", 4000),
			"176.165.66.55": new Peer("176.165.66.55", 4000),
			"2001:3984:3989::104": new Peer("2001:3984:3989::104", 4000),
		};

		for (const peer of Object.values(peersByIp)) {
			peerRepostiory.setPeer(peer);
		}

		for (const [ip, peer] of Object.entries(peersByIp)) {
			assert.equal(peerRepostiory.getPeer(ip), peer);
		}
	});

	it("#forgetPeer - should forget the peer", ({ peerRepostiory }) => {
		const peer = new Peer("176.165.66.55", 4000);

		peerRepostiory.setPeer(peer);

		assert.true(peerRepostiory.hasPeer(peer.ip));
		assert.equal(peerRepostiory.getPeer(peer.ip), peer);

		peerRepostiory.forgetPeer(peer);

		assert.false(peerRepostiory.hasPeer(peer.ip));
		assert.throws(() => peerRepostiory.getPeer(peer.ip));
	});

	it("#hasPeer - should return true if the peer exists", ({ peerRepostiory }) => {
		const peer = new Peer("176.165.66.55", 4000);

		peerRepostiory.setPeer(peer);

		assert.true(peerRepostiory.hasPeer(peer.ip));
	});

	it("#hasPeer - should return false if the peer does not exist", ({ peerRepostiory }) => {
		assert.false(peerRepostiory.hasPeer("176.165.66.55"));
	});

	it("#getPendingPeers - should return the pending peers", ({ peerRepostiory }) => {
		const peers = [new Peer("176.165.66.55", 4000), new Peer("176.165.44.33", 4000)];

		for (const peer of peers) {
			peerRepostiory.setPendingPeer(peer);
		}

		assert.equal(peerRepostiory.getPendingPeers(), peers);
	});

	it("#hasPendingPeers - should return false if there is zero pending peer", ({ peerRepostiory }) => {
		assert.false(peerRepostiory.hasPendingPeers());
	});

	it("#hasPendingPeers - should return true if there is more than zero pending peer", ({ peerRepostiory }) => {
		const peers = [
			new Peer("176.165.66.55", 4000),
			new Peer("176.165.44.33", 4000),
			new Peer("176.165.22.11", 4000),
			new Peer("2001:3984:3989::104", 4000),
		];

		assert.false(peerRepostiory.hasPendingPeers());

		for (const peer of peers) {
			peerRepostiory.setPendingPeer(peer);
			assert.true(peerRepostiory.hasPendingPeers());
		}
	});

	it("#getPendingPeer - should return the pending peer by its ip", ({ peerRepostiory }) => {
		const peersByIp = {
			"176.165.44.33": new Peer("176.165.44.33", 4000),
			"176.165.66.55": new Peer("176.165.66.55", 4000),
			"2001:3984:3989::104": new Peer("2001:3984:3989::104", 4000),
		};
		for (const peer of Object.values(peersByIp)) {
			peerRepostiory.setPendingPeer(peer);
		}
		for (const [ip, peer] of Object.entries(peersByIp)) {
			assert.equal(peerRepostiory.getPendingPeer(ip), peer);
		}
	});

	it("#getPendingPeer - should throw when no pending peer exists for the ip", ({ peerRepostiory }) => {
		const peersByIp = {
			"176.165.44.33": new Peer("176.165.44.33", 4000),
			"176.165.66.55": new Peer("176.165.66.55", 4000),
			"2001:3984:3989::104": new Peer("2001:3984:3989::104", 4000),
		};
		for (const peer of Object.values(peersByIp)) {
			peerRepostiory.setPendingPeer(peer);
		}

		assert.throws(() => peerRepostiory.getPendingPeer("127.0.0.1"));
	});

	it("#setPendingPeer - should set the pending peer by its ip", ({ peerRepostiory }) => {
		const peersByIp = {
			"176.165.44.33": new Peer("176.165.44.33", 4000),
			"176.165.66.55": new Peer("176.165.66.55", 4000),
			"2001:3984:3989::104": new Peer("2001:3984:3989::104", 4000),
		};
		for (const peer of Object.values(peersByIp)) {
			peerRepostiory.setPendingPeer(peer);
		}
		for (const [ip, peer] of Object.entries(peersByIp)) {
			assert.equal(peerRepostiory.getPendingPeer(ip), peer);
		}
	});

	it("#forgetPendingPeer - should forget the pending peer", ({ peerRepostiory }) => {
		const peer = new Peer("176.165.66.55", 4000);

		peerRepostiory.setPendingPeer(peer);

		assert.true(peerRepostiory.hasPendingPeer(peer.ip));
		assert.equal(peerRepostiory.getPendingPeer(peer.ip), peer);

		peerRepostiory.forgetPendingPeer(peer);

		assert.false(peerRepostiory.hasPendingPeer(peer.ip));
		assert.throws(() => peerRepostiory.getPendingPeer(peer.ip));
	});

	it("#hasPendingPeer - should return true if the pending peer exists", ({ peerRepostiory }) => {
		const peer = new Peer("176.165.66.55", 4000);

		peerRepostiory.setPendingPeer(peer);

		assert.true(peerRepostiory.hasPendingPeer(peer.ip));
	});

	it("#hasPendingPeer - should return false if the pending peer does not exist", ({ peerRepostiory }) => {
		assert.false(peerRepostiory.hasPendingPeer("176.165.66.55"));
	});

	it("#getSameSubnetPeers - should get the peers within same subnet of provided ip", ({ peerRepostiory }) => {
		const peers = [
			new Peer("176.165.66.55", 4000),
			new Peer("176.165.66.33", 4000),
			new Peer("176.165.22.11", 4000),
			new Peer("2001:3984:3989::104", 4000),
		];

		for (const peer of peers) {
			peerRepostiory.setPeer(peer);
		}

		assert.equal(peerRepostiory.getSameSubnetPeers("176.165.66.10").length, 2);
		assert.equal(peerRepostiory.getSameSubnetPeers("176.165.22.99").length, 1);
		assert.equal(peerRepostiory.getSameSubnetPeers("176.165.23.10").length, 0);
	});
});
