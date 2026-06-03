import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { Peer } from "./peer";
import { PeerRepository } from "./peer-repository";

describe<{
	app: Application;
	peerRepository: PeerRepository;
}>("PeerRepository", ({ it, assert, beforeEach }) => {
	const port = 4007;

	beforeEach((context) => {
		context.app = new Application();

		context.app
			.bind(Identifiers.TransactionPool.Peer.Factory)
			.toFactory(() => (ip: string) => context.app.resolve(Peer).init(ip, port));

		context.peerRepository = context.app.resolve(PeerRepository);
	});

	it("#getPeers - should return all the peers in an array", ({ peerRepository }) => {
		assert.equal(peerRepository.getPeers(), []);

		peerRepository.setPeer("176.165.66.55");
		peerRepository.setPeer("176.165.44.33");

		const peers = peerRepository.getPeers();
		assert.length(peers, 2);
		assert.equal(
			peers.map((peer) => peer.ip),
			["176.165.66.55", "176.165.44.33"],
		);
	});

	it("#setPeer - should create the peer via the factory with the configured port", ({ peerRepository }) => {
		peerRepository.setPeer("176.165.66.55");

		const peer = peerRepository.getPeer("176.165.66.55");
		assert.equal(peer.ip, "176.165.66.55");
		assert.equal(peer.port, port);
	});

	it("#setPeer - should overwrite an existing peer for the same ip with a fresh instance", ({ peerRepository }) => {
		peerRepository.setPeer("176.165.66.55");
		peerRepository.getPeer("176.165.66.55").errorCount = 9;

		peerRepository.setPeer("176.165.66.55");

		assert.length(peerRepository.getPeers(), 1);
		assert.equal(peerRepository.getPeer("176.165.66.55").errorCount, 0);
	});

	it("#getPeer - should return the peer by its ip", ({ peerRepository }) => {
		peerRepository.setPeer("176.165.66.55");

		assert.equal(peerRepository.getPeer("176.165.66.55").ip, "176.165.66.55");
	});

	it("#getPeer - should throw when no peer exists for the ip", ({ peerRepository }) => {
		assert.throws(() => peerRepository.getPeer("127.0.0.1"));
	});

	it("#forgetPeer - should forget the peer", ({ peerRepository }) => {
		peerRepository.setPeer("176.165.66.55");
		assert.true(peerRepository.hasPeer("176.165.66.55"));

		peerRepository.forgetPeer("176.165.66.55");

		assert.false(peerRepository.hasPeer("176.165.66.55"));
		assert.throws(() => peerRepository.getPeer("176.165.66.55"));
	});

	it("#forgetPeer - should be a no-op when the peer does not exist", ({ peerRepository }) => {
		assert.not.throws(() => peerRepository.forgetPeer("127.0.0.1"));
	});

	it("#hasPeer - should return true if the peer exists", ({ peerRepository }) => {
		peerRepository.setPeer("176.165.66.55");

		assert.true(peerRepository.hasPeer("176.165.66.55"));
	});

	it("#hasPeer - should return false if the peer does not exist", ({ peerRepository }) => {
		assert.false(peerRepository.hasPeer("176.165.66.55"));
	});
});
