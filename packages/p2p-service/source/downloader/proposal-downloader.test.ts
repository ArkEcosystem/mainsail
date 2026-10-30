import { Enums, Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { sleep } from "@mainsail/utils";

import { describe } from "@mainsail/test-runner";
import { ProposalDownloader } from "./proposal-downloader";

describe<{
	app: Application;
	downloader: ProposalDownloader;
	ourHeader: any;
	peer: any;
	appliedListener: { handle: (payload: { data: { number: number } }) => Promise<void> };
}>("ProposalDownloader", ({ it, assert, beforeEach, stub }) => {
	const communicator = { getProposal: async () => ({ proposal: Buffer.alloc(0) }) };
	const repository = { getPeers: () => [] };
	const blockDownloader = { isDownloading: () => false };
	const peerDisposer = { banPeer: () => {} };
	const factory = { makeProposalFromBytes: async () => ({}) };
	const proposalProcessor = { process: async () => Enums.Consensus.ProcessorResult.Accepted };
	const state = { resetLastMessageTime: () => {} };

	beforeEach((context) => {
		// Eligible for download: peer is at our (blockNumber, round), we hold no proposal yet.
		context.ourHeader = { blockNumber: 2, proposal: undefined, round: 0 };
		context.peer = { header: { blockNumber: 2, proposedBlockHash: "a".repeat(64), round: 0 }, ip: "1.2.3.4" };

		context.app = new Application();

		context.app.bind(Identifiers.P2P.Peer.Communicator).toConstantValue(communicator);
		context.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(repository);
		context.app.bind(Identifiers.P2P.Header.Factory).toConstantValue(() => context.ourHeader);
		context.app.bind(Identifiers.P2P.Downloader.Block).toConstantValue(blockDownloader);
		context.app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(peerDisposer);
		context.app.bind(Identifiers.Cryptography.Proposal.Factory).toConstantValue(factory);
		context.app.bind(Identifiers.Consensus.Processor.Proposal).toConstantValue(proposalProcessor);
		context.app.bind(Identifiers.P2P.State).toConstantValue(state);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({
			listen: (event: string, listener: { handle: (payload: { data: { number: number } }) => Promise<void> }) => {
				if (event === Events.BlockEvent.Applied) {
					context.appliedListener = listener;
				}
			},
		});

		context.downloader = context.app.resolve(ProposalDownloader);
	});

	it("#download - should request exactly the job's block and round", ({ downloader, peer }) => {
		const getProposal = stub(communicator, "getProposal").returnValue(new Promise(() => {}));

		downloader.download(peer);

		getProposal.calledWith(peer, { blockNumber: 2, round: 0 });
	});

	it("#download - should release the slot on an empty reply and allow the round to be re-pulled", async ({
		downloader,
		peer,
	}) => {
		const getProposal = stub(communicator, "getProposal").resolvedValue({ proposal: Buffer.alloc(0) });
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(peer);
		assert.true(downloader.isDownloading());

		await sleep(10);

		assert.false(downloader.isDownloading());
		getProposal.calledOnce();
		banPeer.neverCalled();

		downloader.download(peer);
		await sleep(10);

		getProposal.calledTimes(2);
		assert.false(downloader.isDownloading());
	});

	it("#download - should release the slot after a successful download", async ({ downloader, peer }) => {
		stub(communicator, "getProposal").resolvedValue({ proposal: Buffer.from("dead", "hex") });
		stub(factory, "makeProposalFromBytes").resolvedValue({ blockHeader: { number: 2 }, round: 0 });
		const process = stub(proposalProcessor, "process").resolvedValue(Enums.Consensus.ProcessorResult.Accepted);
		const resetLastMessageTime = stub(state, "resetLastMessageTime");
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(peer);
		await sleep(10);

		assert.false(downloader.isDownloading());
		process.calledOnce();
		resetLastMessageTime.calledOnce();
		banPeer.neverCalled();
	});

	it("#download - should not download twice for the same (blockNumber, round) while pending", ({
		downloader,
		peer,
	}) => {
		const getProposal = stub(communicator, "getProposal").returnValue(new Promise(() => {}));

		downloader.download(peer);
		downloader.download(peer);

		getProposal.calledOnce();
	});

	it("#download - should skip a peer that cannot serve our (blockNumber, round)", ({
		downloader,
		ourHeader,
		peer,
	}) => {
		const getProposal = stub(communicator, "getProposal");

		downloader.download({ ...peer, header: { ...peer.header, round: 1 } });
		downloader.download({ ...peer, header: { ...peer.header, blockNumber: 3 } });
		downloader.download({ ...peer, header: { ...peer.header, proposedBlockHash: undefined } });

		ourHeader.proposal = {};
		downloader.download(peer);

		getProposal.neverCalled();
		assert.false(downloader.isDownloading());
	});

	it("#download - should ban the peer, release the slot and retry on a round mismatch", async ({
		downloader,
		peer,
	}) => {
		stub(communicator, "getProposal").resolvedValue({ proposal: Buffer.from("dead", "hex") });
		stub(factory, "makeProposalFromBytes").resolvedValue({ blockHeader: { number: 2 }, round: 1 });
		const banPeer = stub(peerDisposer, "banPeer");
		const getPeers = stub(repository, "getPeers").returnValue([]);

		downloader.download(peer);
		await sleep(10);

		assert.false(downloader.isDownloading());
		banPeer.calledOnce();
		getPeers.calledOnce();
	});

	it("#download - should ban the peer when the proposal is invalid", async ({ downloader, peer }) => {
		stub(communicator, "getProposal").resolvedValue({ proposal: Buffer.from("dead", "hex") });
		stub(factory, "makeProposalFromBytes").resolvedValue({ blockHeader: { number: 2 }, round: 0 });
		stub(proposalProcessor, "process").resolvedValue(Enums.Consensus.ProcessorResult.Invalid);
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(peer);
		await sleep(10);

		assert.false(downloader.isDownloading());
		banPeer.calledOnce();
	});

	it("#tryToDownload - should download from an eligible peer", async ({ downloader, peer }) => {
		const getProposal = stub(communicator, "getProposal").resolvedValue({ proposal: Buffer.alloc(0) });
		stub(repository, "getPeers").returnValue([peer]);

		downloader.tryToDownload();
		assert.true(downloader.isDownloading());

		await sleep(10);
		getProposal.calledOnce();
	});

	it("#tryToDownload - should do nothing while the block downloader is downloading", ({ downloader, peer }) => {
		const getProposal = stub(communicator, "getProposal");
		stub(repository, "getPeers").returnValue([peer]);
		stub(blockDownloader, "isDownloading").returnValue(true);

		downloader.tryToDownload();
		downloader.download(peer);

		getProposal.neverCalled();
		assert.false(downloader.isDownloading());
	});

	it("#initialize - should purge pending downloads for the applied block number", async ({
		downloader,
		peer,
		appliedListener,
	}) => {
		// A request that never settles keeps the slot pending until the block is applied.
		stub(communicator, "getProposal").returnValue(new Promise(() => {}));

		downloader.download(peer);
		assert.true(downloader.isDownloading());

		// An unrelated block number leaves the slot alone; the applied one purges it.
		await appliedListener.handle({ data: { number: 3 } });
		assert.true(downloader.isDownloading());

		await appliedListener.handle({ data: { number: 2 } });
		assert.false(downloader.isDownloading());
	});
});
