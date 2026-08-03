import { Enums, Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { sleep } from "@mainsail/utils";

import { describe } from "@mainsail/test-runner";
import { MessageDownloader } from "./message-downloader";

describe<{
	app: Application;
	downloader: MessageDownloader;
	ourHeader: any;
	peer: any;
	appliedListener: { handle: (payload: { data: { number: number } }) => Promise<void> };
}>("MessageDownloader", ({ it, assert, beforeEach, stub }) => {
	const communicator = { getMessages: async () => ({ precommits: [], prevotes: [] }) };
	const repository = { getPeers: () => [] };
	const blockDownloader = { isDownloading: () => false };
	const peerDisposer = { banPeer: () => {} };
	const factory = { makeMessageFromBytes: async () => ({}) };
	const messageProcessor = { process: async () => Enums.Consensus.ProcessorResult.Accepted };
	const cryptoConfiguration = { getMilestone: () => ({ roundValidators: 2 }) };
	const state = { resetLastMessageTime: () => {} };

	beforeEach((context) => {
		// Eligible for a partial download: peer is at our (blockNumber, round) and has
		// prevotes and precommits (indexes 0 and 1) that we are missing.
		context.ourHeader = {
			blockNumber: 2,
			getValidatorsSignedPrecommitCount: () => 0,
			getValidatorsSignedPrevoteCount: () => 0,
			round: 0,
			validatorsSignedPrecommit: [false, false],
			validatorsSignedPrevote: [false, false],
		};
		context.peer = {
			header: {
				blockNumber: 2,
				round: 0,
				validatorsSignedPrecommit: [true, true],
				validatorsSignedPrevote: [true, true],
			},
			ip: "1.2.3.4",
		};

		context.app = new Application();

		context.app.bind(Identifiers.P2P.Peer.Communicator).toConstantValue(communicator);
		context.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(repository);
		context.app.bind(Identifiers.P2P.Header.Factory).toConstantValue(() => context.ourHeader);
		context.app.bind(Identifiers.P2P.Downloader.Block).toConstantValue(blockDownloader);
		context.app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(peerDisposer);
		context.app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue(factory);
		context.app.bind(Identifiers.Consensus.Processor.Message).toConstantValue(messageProcessor);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(cryptoConfiguration);
		context.app.bind(Identifiers.P2P.State).toConstantValue(state);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({
			listen: (event: string, listener: { handle: (payload: { data: { number: number } }) => Promise<void> }) => {
				if (event === Events.BlockEvent.Applied) {
					context.appliedListener = listener;
				}
			},
		});

		context.downloader = context.app.resolve(MessageDownloader);
	});

	it("#download - should release the downloads on an empty reply and allow them to be re-pulled", async ({
		downloader,
		peer,
	}) => {
		const getMessages = stub(communicator, "getMessages").resolvedValue({ precommits: [], prevotes: [] });
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(peer);
		assert.true(downloader.isDownloading());

		await sleep(10);

		assert.false(downloader.isDownloading());
		getMessages.calledOnce();
		banPeer.neverCalled();

		downloader.download(peer);
		await sleep(10);

		getMessages.calledTimes(2);
		assert.false(downloader.isDownloading());
	});

	it("#download - should release the downloads after a successful download", async ({ downloader, peer }) => {
		// The peer only has messages of validator 0, so the reply is complete.
		peer.header.validatorsSignedPrevote = [true, false];
		peer.header.validatorsSignedPrecommit = [true, false];

		stub(communicator, "getMessages").resolvedValue({
			precommits: [Buffer.alloc(1)],
			prevotes: [Buffer.alloc(1)],
		});
		stub(factory, "makeMessageFromBytes").resolvedValueSequence([
			{ blockNumber: 2, round: 0, validatorIndex: 0 },
			{ blockNumber: 2, round: 0, validatorIndex: 0 },
		]);
		const process = stub(messageProcessor, "process").resolvedValue(Enums.Consensus.ProcessorResult.Accepted);
		const resetLastMessageTime = stub(state, "resetLastMessageTime");
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(peer);
		await sleep(10);

		assert.false(downloader.isDownloading());
		process.calledTimes(2);
		resetLastMessageTime.calledOnce();
		banPeer.neverCalled();
	});

	it("#download - should not download twice for the same messages while pending", ({ downloader, peer }) => {
		const getMessages = stub(communicator, "getMessages").returnValue(new Promise(() => {}));

		downloader.download(peer);
		downloader.download(peer);

		getMessages.calledOnce();
	});

	it("#download - should skip a peer that has nothing to serve", ({ downloader, ourHeader, peer }) => {
		const getMessages = stub(communicator, "getMessages");

		downloader.download({ ...peer, header: { ...peer.header, blockNumber: 3 } });
		downloader.download({
			...peer,
			header: {
				...peer.header,
				validatorsSignedPrecommit: [false, false],
				validatorsSignedPrevote: [false, false],
			},
		});

		ourHeader.round = 1;
		downloader.download(peer);

		// No requests go out; `isDownloading()` is not asserted because the eligibility
		// check itself pre-creates empty bitmap entries.
		getMessages.neverCalled();
	});

	it("#download - should download a full round when the peer is ahead", async ({ downloader, peer }) => {
		// Round 1 with a blocking minority (> 1/3) of prevotes: the full round is downloaded.
		peer.header.round = 1;
		peer.header.validatorsSignedPrevote = [true, false];

		const getMessages = stub(communicator, "getMessages").resolvedValue({ precommits: [], prevotes: [] });

		downloader.download(peer);
		assert.true(downloader.isDownloading());
		downloader.download(peer);

		await sleep(10);

		getMessages.calledOnce();
		assert.false(downloader.isDownloading());
	});

	it("#download - should ban the peer when a message is for another block", async ({ downloader, peer }) => {
		stub(communicator, "getMessages").resolvedValue({ precommits: [], prevotes: [Buffer.alloc(1)] });
		stub(factory, "makeMessageFromBytes").resolvedValue({ blockNumber: 3, round: 0, validatorIndex: 0 });
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(peer);
		await sleep(10);

		assert.false(downloader.isDownloading());
		banPeer.calledOnce();
	});

	it("#download - should ban the peer and retry when a message is invalid", async ({ downloader, peer }) => {
		stub(communicator, "getMessages").resolvedValue({ precommits: [], prevotes: [Buffer.alloc(1)] });
		stub(factory, "makeMessageFromBytes").resolvedValue({ blockNumber: 2, round: 0, validatorIndex: 0 });
		stub(messageProcessor, "process").resolvedValue(Enums.Consensus.ProcessorResult.Invalid);
		const banPeer = stub(peerDisposer, "banPeer");
		const getPeers = stub(repository, "getPeers").returnValue([]);

		downloader.download(peer);
		await sleep(10);

		assert.false(downloader.isDownloading());
		banPeer.calledOnce();
		getPeers.calledOnce();
	});

	it("#tryToDownload - should download from an eligible peer", async ({ downloader, peer }) => {
		const getMessages = stub(communicator, "getMessages").resolvedValue({ precommits: [], prevotes: [] });
		stub(repository, "getPeers").returnValue([peer]);

		downloader.tryToDownload();
		assert.true(downloader.isDownloading());

		await sleep(10);
		getMessages.calledOnce();
	});

	it("#tryToDownload - should do nothing while the block downloader is downloading", ({ downloader, peer }) => {
		const getMessages = stub(communicator, "getMessages");
		stub(repository, "getPeers").returnValue([peer]);
		stub(blockDownloader, "isDownloading").returnValue(true);

		downloader.tryToDownload();
		downloader.download(peer);

		getMessages.neverCalled();
		assert.false(downloader.isDownloading());
	});

	it("#initialize - should purge pending downloads for the applied block number", async ({
		downloader,
		peer,
		appliedListener,
	}) => {
		// Two requests that never settle keep a partial and a full download pending.
		stub(communicator, "getMessages").returnValue(new Promise(() => {}));

		downloader.download(peer);
		downloader.download({
			...peer,
			header: { ...peer.header, round: 1, validatorsSignedPrevote: [true, false] },
		});
		assert.true(downloader.isDownloading());

		// An unrelated block number leaves the downloads alone; the applied one purges them.
		await appliedListener.handle({ data: { number: 3 } });
		assert.true(downloader.isDownloading());

		await appliedListener.handle({ data: { number: 2 } });
		assert.false(downloader.isDownloading());
	});
});
