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
	const logger = { debug: () => {} };
	// By the time the async listener runs, the store may already be past the applied block;
	// the purge must use the event payload, so this deliberately disagrees with it.
	const stateStore = { getBlockNumber: () => 3 };

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
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(logger);
		context.app.bind(Identifiers.State.Store).toConstantValue(stateStore);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({
			listen: (event: string, listener: { handle: (payload: { data: { number: number } }) => Promise<void> }) => {
				if (event === Events.BlockEvent.Applied) {
					context.appliedListener = listener;
				}
			},
		});

		context.downloader = context.app.resolve(MessageDownloader);
	});

	it("#download - should request exactly the job's block, round and our bitmaps for a partial download", ({
		downloader,
		peer,
	}) => {
		const getMessages = stub(communicator, "getMessages").returnValue(new Promise(() => {}));

		downloader.download(peer);

		getMessages.calledWith(peer, {
			blockNumber: 2,
			round: 0,
			validatorsSignedPrecommit: [false, false],
			validatorsSignedPrevote: [false, false],
		});
	});

	it("#download - should request the whole target round for a full download", ({ downloader, peer }) => {
		stub(cryptoConfiguration, "getMilestone").returnValue({ roundValidators: 5 });
		peer.header.round = 1;
		peer.header.validatorsSignedPrevote = [true, true, false, false, false];
		peer.header.validatorsSignedPrecommit = [false, false, false, false, false];

		const getMessages = stub(communicator, "getMessages").returnValue(new Promise(() => {}));

		downloader.download(peer);

		// All-false bitmaps: "we have nothing of that round, send everything".
		getMessages.calledWith(peer, {
			blockNumber: 2,
			round: 1,
			validatorsSignedPrecommit: [false, false, false, false, false],
			validatorsSignedPrevote: [false, false, false, false, false],
		});
	});

	it("#download - should accept a complete reply for the requested round", async ({ downloader, peer }) => {
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

	it("#download - should not ban a peer that delivers the blocking minority it advertised", async ({
		downloader,
		peer,
	}) => {
		// Early in a round there are legitimately no precommits, and the advertised blocking
		// minority of prevotes is all the peer ever promised.
		stub(cryptoConfiguration, "getMilestone").returnValue({ roundValidators: 5 });
		peer.header.round = 1;
		peer.header.validatorsSignedPrevote = [true, true, false, false, false];
		peer.header.validatorsSignedPrecommit = [false, false, false, false, false];

		stub(communicator, "getMessages").resolvedValue({
			precommits: [],
			prevotes: [Buffer.alloc(1), Buffer.alloc(1)],
		});
		stub(factory, "makeMessageFromBytes").resolvedValueSequence([
			{ blockNumber: 2, round: 1, validatorIndex: 0 },
			{ blockNumber: 2, round: 1, validatorIndex: 1 },
		]);
		const process = stub(messageProcessor, "process").resolvedValue(Enums.Consensus.ProcessorResult.Accepted);
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(peer);
		await sleep(10);

		banPeer.neverCalled();
		process.calledTimes(2);
		assert.false(downloader.isDownloading());
	});

	it("#download - should download a full round advertised by a blocking minority of precommits", ({
		downloader,
		peer,
	}) => {
		// A blocking minority of precommits lets consensus jump rounds just like one of
		// prevotes, so it justifies a full download all the same.
		stub(cryptoConfiguration, "getMilestone").returnValue({ roundValidators: 5 });
		peer.header.round = 1;
		peer.header.validatorsSignedPrevote = [false, false, false, false, false];
		peer.header.validatorsSignedPrecommit = [true, true, false, false, false];

		const getMessages = stub(communicator, "getMessages").returnValue(new Promise(() => {}));

		downloader.download(peer);

		getMessages.calledWith(peer, {
			blockNumber: 2,
			round: 1,
			validatorsSignedPrecommit: [false, false, false, false, false],
			validatorsSignedPrevote: [false, false, false, false, false],
		});
	});

	it("#download - should not ban a peer that delivers the blocking minority of precommits it advertised", async ({
		downloader,
		peer,
	}) => {
		stub(cryptoConfiguration, "getMilestone").returnValue({ roundValidators: 5 });
		peer.header.round = 1;
		peer.header.validatorsSignedPrevote = [false, false, false, false, false];
		peer.header.validatorsSignedPrecommit = [true, true, false, false, false];

		stub(communicator, "getMessages").resolvedValue({
			precommits: [Buffer.alloc(1), Buffer.alloc(1)],
			prevotes: [],
		});
		stub(factory, "makeMessageFromBytes").resolvedValueSequence([
			{ blockNumber: 2, round: 1, validatorIndex: 0 },
			{ blockNumber: 2, round: 1, validatorIndex: 1 },
		]);
		const process = stub(messageProcessor, "process").resolvedValue(Enums.Consensus.ProcessorResult.Accepted);
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(peer);
		await sleep(10);

		banPeer.neverCalled();
		process.calledTimes(2);
		assert.false(downloader.isDownloading());
	});

	it("#download - should not punish a reply below the advertised blocking minority of precommits", async ({
		downloader,
		peer,
	}) => {
		stub(cryptoConfiguration, "getMilestone").returnValue({ roundValidators: 5 });
		peer.header.round = 1;
		peer.header.validatorsSignedPrevote = [false, false, false, false, false];
		peer.header.validatorsSignedPrecommit = [true, true, false, false, false];

		// It answers for the requested round, but below any blocking minority. A crash on the
		// peer's side can explain the shortfall, so it is not provable misbehavior.
		stub(communicator, "getMessages").resolvedValue({ precommits: [Buffer.alloc(1)], prevotes: [] });
		stub(factory, "makeMessageFromBytes").resolvedValue({ blockNumber: 2, round: 1, validatorIndex: 0 });
		const process = stub(messageProcessor, "process").resolvedValue(Enums.Consensus.ProcessorResult.Accepted);
		const banPeer = stub(peerDisposer, "banPeer");
		const debug = stub(logger, "debug");

		downloader.download(peer);
		await sleep(10);

		banPeer.neverCalled();
		debug.calledOnce();
		process.calledOnce();
		assert.false(downloader.isDownloading());
	});

	it("#download - should keep a reply that is missing a requested message and not punish it", async ({
		downloader,
		peer,
	}) => {
		// The peer's header promised these messages, but a crash on its side can explain the
		// shortfall; what did arrive is kept.
		stub(communicator, "getMessages").resolvedValue({ precommits: [], prevotes: [Buffer.alloc(1)] });
		stub(factory, "makeMessageFromBytes").resolvedValue({ blockNumber: 2, round: 0, validatorIndex: 0 });
		const process = stub(messageProcessor, "process").resolvedValue(Enums.Consensus.ProcessorResult.Accepted);
		const banPeer = stub(peerDisposer, "banPeer");
		const debug = stub(logger, "debug");

		downloader.download(peer);
		await sleep(10);

		banPeer.neverCalled();
		debug.calledOnce();
		process.calledOnce();
		assert.false(downloader.isDownloading());
	});

	it("#download - should not punish a reply below the advertised blocking minority of prevotes", async ({
		downloader,
		peer,
	}) => {
		stub(cryptoConfiguration, "getMilestone").returnValue({ roundValidators: 5 });
		peer.header.round = 1;
		peer.header.validatorsSignedPrevote = [true, true, false, false, false];
		peer.header.validatorsSignedPrecommit = [false, false, false, false, false];

		// It answers for the requested round, but without the promised prevotes. A crash on
		// the peer's side can explain the shortfall, so it is not provable misbehavior.
		stub(communicator, "getMessages").resolvedValue({ precommits: [Buffer.alloc(1)], prevotes: [] });
		stub(factory, "makeMessageFromBytes").resolvedValue({ blockNumber: 2, round: 1, validatorIndex: 0 });
		const process = stub(messageProcessor, "process").resolvedValue(Enums.Consensus.ProcessorResult.Accepted);
		const banPeer = stub(peerDisposer, "banPeer");
		const debug = stub(logger, "debug");

		downloader.download(peer);
		await sleep(10);

		banPeer.neverCalled();
		debug.calledOnce();
		process.calledOnce();
		assert.false(downloader.isDownloading());
	});

	it("#download - should not police a round the peer's header never described", async ({ downloader, peer }) => {
		// The peer is a round ahead without a blocking minority, so the job settles for the
		// round below — about which the peer promised nothing. A thin reply is fine.
		stub(cryptoConfiguration, "getMilestone").returnValue({ roundValidators: 5 });
		peer.header.round = 1;
		peer.header.validatorsSignedPrevote = [true, false, false, false, false];
		peer.header.validatorsSignedPrecommit = [true, false, false, false, false];

		stub(communicator, "getMessages").resolvedValue({ precommits: [], prevotes: [Buffer.alloc(1)] });
		stub(factory, "makeMessageFromBytes").resolvedValue({ blockNumber: 2, round: 0, validatorIndex: 0 });
		const process = stub(messageProcessor, "process").resolvedValue(Enums.Consensus.ProcessorResult.Accepted);
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(peer);
		await sleep(10);

		banPeer.neverCalled();
		process.calledOnce();
		assert.false(downloader.isDownloading());
	});

	it("#download - should ban a peer that answers for a round the job never requested", async ({
		downloader,
		peer,
	}) => {
		// The responder serves exactly the queried round or nothing; anything else cannot
		// come from an honest peer.
		stub(communicator, "getMessages").resolvedValue({ precommits: [], prevotes: [Buffer.alloc(1)] });
		stub(factory, "makeMessageFromBytes").resolvedValue({ blockNumber: 2, round: 1, validatorIndex: 0 });
		const process = stub(messageProcessor, "process");
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(peer);
		await sleep(10);

		banPeer.calledOnce();
		process.neverCalled();
		assert.false(downloader.isDownloading());
	});

	it("#download - should ban a peer that answers for a block the job never requested", async ({
		downloader,
		peer,
	}) => {
		stub(communicator, "getMessages").resolvedValue({ precommits: [], prevotes: [Buffer.alloc(1)] });
		stub(factory, "makeMessageFromBytes").resolvedValue({ blockNumber: 3, round: 0, validatorIndex: 0 });
		const process = stub(messageProcessor, "process");
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(peer);
		await sleep(10);

		banPeer.calledOnce();
		process.neverCalled();
		assert.false(downloader.isDownloading());
	});

	it("#download - should ban the peer when one list mixes rounds", async ({ downloader, peer }) => {
		// Timing cannot explain a single list about two different rounds.
		stub(communicator, "getMessages").resolvedValue({
			precommits: [],
			prevotes: [Buffer.alloc(1), Buffer.alloc(1)],
		});
		stub(factory, "makeMessageFromBytes").resolvedValueSequence([
			{ blockNumber: 2, round: 0, validatorIndex: 0 },
			{ blockNumber: 2, round: 1, validatorIndex: 1 },
		]);
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(peer);
		await sleep(10);

		banPeer.calledOnce();
		assert.false(downloader.isDownloading());
	});

	it("#download - should ban the peer and retry when a message is invalid", async ({ downloader, peer }) => {
		stub(communicator, "getMessages").resolvedValue({ precommits: [], prevotes: [Buffer.alloc(1)] });
		stub(factory, "makeMessageFromBytes").resolvedValue({ blockNumber: 2, round: 0, validatorIndex: 0 });
		stub(messageProcessor, "process").resolvedValue(Enums.Consensus.ProcessorResult.Invalid);
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(peer);
		await sleep(10);

		banPeer.calledOnce();
		assert.false(downloader.isDownloading());
	});

	it("#download - should release the downloads under the round the job actually used", async ({
		downloader,
		peer,
	}) => {
		// Peer a round ahead without a blocking minority: the job runs for our round and its
		// slot must be marked and cleared under that same round, or it can never be re-pulled.
		stub(cryptoConfiguration, "getMilestone").returnValue({ roundValidators: 5 });
		peer.header.round = 1;
		peer.header.validatorsSignedPrevote = [true, false, false, false, false];
		peer.header.validatorsSignedPrecommit = [false, false, false, false, false];

		const getMessages = stub(communicator, "getMessages").resolvedValue({ precommits: [], prevotes: [] });

		downloader.download(peer);
		await sleep(10);

		assert.false(downloader.isDownloading());

		downloader.download(peer);
		await sleep(10);

		getMessages.calledTimes(2);
	});

	it("#download - should not report itself busy after probing a peer with nothing to serve", ({
		downloader,
		peer,
	}) => {
		const getMessages = stub(communicator, "getMessages");

		peer.header.validatorsSignedPrevote = [false, false];
		peer.header.validatorsSignedPrecommit = [false, false];
		downloader.download(peer);

		getMessages.neverCalled();
		assert.false(downloader.isDownloading());
	});

	it("#download - should not download twice for the same messages while pending", ({ downloader, peer }) => {
		const getMessages = stub(communicator, "getMessages").returnValue(new Promise(() => {}));

		downloader.download(peer);
		downloader.download(peer);

		getMessages.calledOnce();
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
		banPeer.neverCalled();

		downloader.download(peer);
		await sleep(10);

		getMessages.calledTimes(2);
	});

	it("#initialize - should purge pending downloads for the applied block number", async (context) => {
		// The common case: the handler runs before anything else is applied.
		stub(stateStore, "getBlockNumber").returnValue(2);
		stub(communicator, "getMessages").returnValue(new Promise(() => {}));

		context.downloader.download(context.peer);
		assert.true(context.downloader.isDownloading());

		await context.appliedListener.handle({ data: { number: 2 } });

		assert.false(context.downloader.isDownloading());
	});

	it("#initialize - should purge the applied block even when the store has moved past it", async (context) => {
		// The event is dispatched when block 2 is applied, but the handler is async: block 3
		// may be applied before it runs. The purge must use the number the event carries —
		// the stubbed store already reports 3.
		stub(communicator, "getMessages").returnValue(new Promise(() => {}));

		context.downloader.download(context.peer);
		assert.true(context.downloader.isDownloading());

		await context.appliedListener.handle({ data: { number: 2 } });

		assert.false(context.downloader.isDownloading());
	});
});
