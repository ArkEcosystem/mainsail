import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { PeerDiscoverer } from "./peer-discoverer";

const makePeer = (ip: string): any => ({ ip, port: 4002 });

describe<{
	discoverer: PeerDiscoverer;
	repository: any;
	seeds: any;
	communicator: any;
	processor: any;
	peerDisposer: any;
}>("PeerDiscoverer", ({ it, assert, beforeEach, spy }) => {
	beforeEach((context) => {
		context.repository = { hasPeer: () => false, setKnownPeer: () => {} };
		context.seeds = { all: () => ["1.1.1.1", "2.2.2.2"] };
		context.communicator = { getActivePeers: async () => ({ peers: [] }) };
		context.processor = { validateAndAcceptPeer: async () => {} };
		context.peerDisposer = { banPeer: () => {} };

		const app = new Application();
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.P2P.Peer.Seeds).toConstantValue(context.seeds);
		app.bind(Identifiers.P2P.Peer.Factory).toConstantValue((ip: string) => makePeer(ip));
		app.bind(Identifiers.P2P.Peer.Communicator).toConstantValue(context.communicator);
		app.bind(Identifiers.P2P.Peer.Processor).toConstantValue(context.processor);
		app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(context.peerDisposer);
		app.bind(Identifiers.Services.Log.Service).toConstantValue({ debug: () => {} });

		context.discoverer = app.resolve(PeerDiscoverer);
	});

	it("#populateSeedPeers - should record the seeds as known peers", async ({ discoverer, repository }) => {
		const setKnownPeer = spy(repository, "setKnownPeer");

		await discoverer.populateSeedPeers();

		setKnownPeer.calledTimes(2);
		setKnownPeer.calledWith(makePeer("1.1.1.1"));
		setKnownPeer.calledWith(makePeer("2.2.2.2"));
	});

	it("#populateSeedPeers - should skip seeds the repository already holds", async ({ discoverer, repository }) => {
		repository.hasPeer = () => true;
		const setKnownPeer = spy(repository, "setKnownPeer");

		await discoverer.populateSeedPeers();

		setKnownPeer.neverCalled();
	});

	it("#discoverPeers - should hand every address the peer reports to the processor", async ({
		discoverer,
		communicator,
		processor,
	}) => {
		communicator.getPeers = async () => ({ peers: [makePeer("3.3.3.3"), makePeer("4.4.4.4")] });
		const validateAndAcceptPeer = spy(processor, "validateAndAcceptPeer");

		await discoverer.discoverPeers(makePeer("1.1.1.1"));

		validateAndAcceptPeer.calledTimes(2);
		validateAndAcceptPeer.calledWith("3.3.3.3");
		validateAndAcceptPeer.calledWith("4.4.4.4");
	});

	it("#discoverPeers - should ban the peer when it does not answer", async ({
		discoverer,
		communicator,
		peerDisposer,
	}) => {
		communicator.getPeers = async () => {
			throw new Error("boom");
		};
		const banPeer = spy(peerDisposer, "banPeer");

		await discoverer.discoverPeers(makePeer("1.1.1.1"));

		assert.equal(banPeer.getCallArgs(0)[0], "1.1.1.1");
	});
});
