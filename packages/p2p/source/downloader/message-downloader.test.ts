import { Enums, Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

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
