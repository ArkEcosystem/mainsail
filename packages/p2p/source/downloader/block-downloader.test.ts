import { Enums, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { sleep } from "@mainsail/utils";

import { describe } from "@mainsail/test-runner";
import { BlockDownloader } from "./block-downloader";

describe<{
	app: Application;
	downloader: BlockDownloader;
}>("BlockDownloader", ({ it, assert, beforeEach, stub }) => {
	const communicator = { getBlocks: async () => ({ blocks: [] }) };
	const repository = { getPeers: () => [] };
	const peerDisposer = { banPeer: () => {} };
	const configuration = { getMilestone: () => ({ block: { maxPayload: 2_097_152 } }) };
	// One slice per batch: every batch fits into the round that starts at its first block.
	const roundCalculator = { calculateRound: () => ({ maxValidators: 400, roundHeight: 1 }) };
	const stateStore = { getBlockNumber: () => 0, getLastBlock: () => ({ hash: "hash0" }) };
	const state = { resetLastMessageTime: () => {} };
	const commitProcessor = {
		hasValidSignature: async () => true,
		process: async () => Enums.Consensus.ProcessorResult.Accepted,
	};
	// Blocks are one-byte buffers carrying their block number.
	const commitFactory = {
		fromBytes: async (buffer: Buffer) => ({ block: { hash: `hash${buffer[0]}`, number: buffer[0] } }),
	};
	const logger = { debug: () => {}, error: () => {}, info: () => {}, warning: () => {} };

	const makePeer = (blockNumber: number, ip = "1.2.3.4") => ({ header: { blockNumber }, ip });
	const makeBlock = (number: number, size = 1): Buffer => {
		const buffer = Buffer.alloc(size);
		buffer[0] = number;
		return buffer;
	};

	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.P2P.Peer.Communicator).toConstantValue(communicator);
		context.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(repository);
		context.app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(peerDisposer);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(configuration);
		context.app.bind(Identifiers.BlockchainUtils.RoundCalculator).toConstantValue(roundCalculator);
		context.app.bind(Identifiers.State.Store).toConstantValue(stateStore);
		context.app.bind(Identifiers.P2P.State).toConstantValue(state);
		context.app.bind(Identifiers.Consensus.Processor.Commit).toConstantValue(commitProcessor);
		context.app.bind(Identifiers.Cryptography.Commit.Factory).toConstantValue(commitFactory);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(logger);

		context.downloader = context.app.resolve(BlockDownloader);
	});

	it("#download - should request the expected ranges", ({ downloader }) => {
		const getBlocks = stub(communicator, "getBlocks").returnValue(new Promise(() => {}));

		// Stored blocks end at peer height - 1; the first job starts after our stored block (0).
		const peer = makePeer(3);
		downloader.download(peer);
		getBlocks.calledWith(peer, { fromBlockNumber: 1, limit: 2 });

		// The next job continues after the last requested block and is capped at 400 blocks.
		const farAhead = makePeer(1000);
		downloader.download(farAhead);
		getBlocks.calledWith(farAhead, { fromBlockNumber: 3, limit: 400 });

		assert.true(downloader.isDownloading());
	});

	it("#download - should not download when the peer has nothing new", ({ downloader }) => {
		const getBlocks = stub(communicator, "getBlocks");

		downloader.download(makePeer(0));
		downloader.download(makePeer(1));

		getBlocks.neverCalled();
		assert.false(downloader.isDownloading());
	});

	it("#download - should not exceed the job cap", ({ downloader }) => {
		const getBlocks = stub(communicator, "getBlocks").returnValue(new Promise(() => {}));

		for (let index = 0; index < 12; index++) {
			downloader.download(makePeer(100_000));
		}

		getBlocks.calledTimes(10);
	});

	it("#download - should process a successful batch and continue with the next job", async ({ downloader }) => {
		const getBlocks = stub(communicator, "getBlocks")
			.resolvedValueNth(0, { blocks: [makeBlock(1), makeBlock(2)] })
			.resolvedValueNth(1, { blocks: [makeBlock(3)] });
		const process = stub(commitProcessor, "process").resolvedValue(Enums.Consensus.ProcessorResult.Accepted);
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(makePeer(3));
		downloader.download(makePeer(4));
		assert.true(downloader.isDownloading());

		await sleep(10);

		process.calledTimes(3);
		banPeer.neverCalled();
		assert.false(downloader.isDownloading());
		getBlocks.calledTimes(2);
	});

	it("#download - should ban the peer and replay with another peer when the request fails", async ({
		downloader,
	}) => {
		let calls = 0;
		const getBlocks = stub(communicator, "getBlocks").callsFake(() =>
			++calls === 1 ? Promise.reject(new Error("boom")) : new Promise(() => {}),
		);
		const banPeer = stub(peerDisposer, "banPeer");
		stub(repository, "getPeers").returnValue([makePeer(1000, "2.2.2.2")]);

		downloader.download(makePeer(3));
		await sleep(10);

		banPeer.calledOnce();
		getBlocks.calledTimes(2);
		assert.true(downloader.isDownloading());
	});

	it("#download - should truncate the queue when no peer can serve the replay", async ({ downloader }) => {
		stub(communicator, "getBlocks").rejectedValue(new Error("boom"));
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(makePeer(3));
		await sleep(10);

		banPeer.calledOnce();
		assert.false(downloader.isDownloading());
	});

	it("#download - should ban a peer that returns fewer blocks than requested", async ({ downloader }) => {
		stub(communicator, "getBlocks").resolvedValue({ blocks: [makeBlock(1)] });
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(makePeer(3));
		await sleep(10);

		banPeer.calledOnce();
		assert.false(downloader.isDownloading());
	});

	it("#download - should skip already applied blocks instead of banning the peer", async ({ downloader }) => {
		// Realistic signature check: a commit's proof signs over its predecessor's hash.
		const hasValidSignature = stub(commitProcessor, "hasValidSignature").callsFake(
			async (commit: any, previousBlockHash: string) => previousBlockHash === `hash${commit.block.number - 1}`,
		);
		const process = stub(commitProcessor, "process").resolvedValue(Enums.Consensus.ProcessorResult.Accepted);
		const banPeer = stub(peerDisposer, "banPeer");

		let resolveBlocks: any;
		stub(communicator, "getBlocks").returnValue(new Promise((resolve) => (resolveBlocks = resolve)));

		// Job for blocks 1-3 while our stored block is 0.
		downloader.download(makePeer(4));

		// Consensus commits blocks 1 and 2 via live gossip while the download is in flight.
		stub(stateStore, "getBlockNumber").returnValue(2);
		stub(stateStore, "getLastBlock").returnValue({ hash: "hash2" });

		resolveBlocks({ blocks: [makeBlock(1), makeBlock(2), makeBlock(3)] });
		await sleep(10);

		// Only block 3 is verified (against the store's block 2) and processed; no ban.
		banPeer.neverCalled();
		hasValidSignature.calledOnce();
		process.calledOnce();
		assert.false(downloader.isDownloading());
	});

	it("#download - should skip exactly the applied block when the store advanced by one", async ({ downloader }) => {
		const hasValidSignature = stub(commitProcessor, "hasValidSignature").callsFake(
			async (commit: any, previousBlockHash: string) => previousBlockHash === `hash${commit.block.number - 1}`,
		);
		const process = stub(commitProcessor, "process").resolvedValue(Enums.Consensus.ProcessorResult.Accepted);
		const banPeer = stub(peerDisposer, "banPeer");

		let resolveBlocks: any;
		stub(communicator, "getBlocks").returnValue(new Promise((resolve) => (resolveBlocks = resolve)));

		// Job for blocks 1-2 while our stored block is 0.
		downloader.download(makePeer(3));

		// The boundary case: exactly the first block of the job gets applied meanwhile.
		stub(stateStore, "getBlockNumber").returnValue(1);
		stub(stateStore, "getLastBlock").returnValue({ hash: "hash1" });

		resolveBlocks({ blocks: [makeBlock(1), makeBlock(2)] });
		await sleep(10);

		// Block 1 is dropped, block 2 is verified against block 1 and processed; no ban.
		banPeer.neverCalled();
		hasValidSignature.calledOnce();
		process.calledOnce();
		assert.false(downloader.isDownloading());
	});

	it("#download - should complete a job whose blocks were all applied meanwhile", async ({ downloader }) => {
		const hasValidSignature = stub(commitProcessor, "hasValidSignature").callsFake(
			async (commit: any, previousBlockHash: string) => previousBlockHash === `hash${commit.block.number - 1}`,
		);
		const process = stub(commitProcessor, "process");
		const banPeer = stub(peerDisposer, "banPeer");

		let resolveBlocks: any;
		stub(communicator, "getBlocks").returnValue(new Promise((resolve) => (resolveBlocks = resolve)));

		// Job for blocks 1-2 while our stored block is 0.
		downloader.download(makePeer(3));

		stub(stateStore, "getBlockNumber").returnValue(2);
		stub(stateStore, "getLastBlock").returnValue({ hash: "hash2" });

		resolveBlocks({ blocks: [makeBlock(1), makeBlock(2)] });
		await sleep(10);

		banPeer.neverCalled();
		hasValidSignature.neverCalled();
		process.neverCalled();
		assert.false(downloader.isDownloading());
	});

	it("#download - should not ban when the short reply was near the payload limit", async ({ downloader }) => {
		// 3 MiB of block data: adding another maxPayload (2 MiB) block could exceed the 5 MiB
		// response limit, so the short reply is legitimate.
		stub(communicator, "getBlocks").resolvedValue({ blocks: [makeBlock(1, 3_145_728)] });
		const banPeer = stub(peerDisposer, "banPeer");

		downloader.download(makePeer(3));
		await sleep(10);

		banPeer.neverCalled();
		assert.false(downloader.isDownloading());
	});
});
