import { Identifiers } from "@mainsail/contracts";

import { describeSkip, Sandbox } from "../../test-framework";
import { BlockDownloader } from "./block-downloader";
import { ChunkCache } from "./chunk-cache";
import { Peer } from "./peer";
import { PeerVerificationResult } from "./peer-verifier";

describeSkip<{
	sandbox: Sandbox;
	blockDownloader: BlockDownloader;
	peer: Peer;
}>("NetworkMonitor", ({ it, assert, beforeEach, stub, spy, match }) => {
	const logger = { debug: () => {}, error: () => {}, info: () => {} };

	const communicator = {
		getPeerBlocks: () => {},
		getPeers: () => {},
		ping: () => {},
		pingPorts: () => {},
		postBlock: () => {},
	};
	const repository = { forgetPeer: () => {}, getPeers: () => [] };
	const networkMonitor = { getNetworkHeight: () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(logger);
		context.sandbox.app.bind(Identifiers.PeerChunkCache).to(ChunkCache).inSingletonScope();
		context.sandbox.app.bind(Identifiers.PeerNetworkMonitor).toConstantValue(networkMonitor);
		context.sandbox.app.bind(Identifiers.PeerCommunicator).toConstantValue(communicator);
		context.sandbox.app.bind(Identifiers.PeerRepository).toConstantValue(repository);
		context.sandbox.app.bind(Identifiers.QueueFactory).toConstantValue({});

		context.blockDownloader = context.sandbox.app.resolve(BlockDownloader);
		context.peer = context.sandbox.app.resolve(Peer).init("1.1.1.1", 4000);
	});

	it("#downloadBlocksFromHeight - should return empty array and log an error when we have zero peer", async ({
		blockDownloader,
	}) => {
		const spyLoggerErrror = spy(logger, "error");

		const blocks = await blockDownloader.downloadBlocksFromHeight(1);

		assert.equal(blocks, []);
		spyLoggerErrror.calledOnce();
		spyLoggerErrror.calledWith("Could not download blocks: we have 0 peers");
	});

	it.skip("#downloadBlocksFromHeight - should return empty array and log an error when all our peers are forked", async ({
		blockDownloader,
	}) => {
		const peer = new Peer("1.1.1.1", 4000);
		peer.state = { header: {}, height: 4 };
		peer.verificationResult = new PeerVerificationResult(3, 4, 2);
		stub(repository, "getPeers").returnValue([peer]);

		const spyLoggerErrror = spy(logger, "error");

		const blocks = await blockDownloader.downloadBlocksFromHeight(1);

		assert.equal(blocks, []);
		spyLoggerErrror.calledOnce();
		spyLoggerErrror.calledWith(
			"Could not download blocks: We have 1 peer(s) but all of them are on a different chain than us",
		);
	});

	it("#downloadBlocksFromHeight - should download blocks from 1 peer", async ({ blockDownloader, peer }) => {
		const mockBlock = { id: "123456" };

		stub(communicator, "getPeerBlocks").returnValue([mockBlock]);

		peer.state = { header: {}, height: 2 };
		peer.verificationResult = { forked: false, highestCommonHeight: 2, hisHeight: 2, myHeight: 2 };
		stub(repository, "getPeers").returnValue([peer]);

		const blocks = await blockDownloader.downloadBlocksFromHeight(1);

		assert.equal(blocks, [mockBlock]);
	});

	it("#downloadBlocksFromHeight - should download blocks from 1 peer - peer returns zero blocks", async ({
		blockDownloader,
		peer,
	}) => {
		stub(communicator, "getPeerBlocks").returnValue([]);

		peer.state = { header: {}, height: 2 };
		peer.verificationResult = { forked: false, highestCommonHeight: 2, hisHeight: 2, myHeight: 2 };
		stub(repository, "getPeers").returnValue([peer]);

		const blocks = await blockDownloader.downloadBlocksFromHeight(1);

		assert.equal(blocks, []);
	});

	it.skip("#downloadBlocksFromHeight - should download blocks in parallel from N peers max", async ({
		blockDownloader,
		sandbox,
	}) => {
		const maxParallelDownloads = 10;
		const downloadChunkSize = 400;
		const baseHeight = 50_000;

		const expectedBlocksFromHeight = (height) => {
			const blocks = [];
			for (let index = 0; index < maxParallelDownloads * downloadChunkSize; index++) {
				blocks.push({ height: height + 1 + index });
			}
			return blocks;
		};

		const mockedGetPeerBlocks = (peer, { fromBlockHeight }) => {
			if (fromBlockHeight + 1 === baseHeight) {
				throw new Error(`Cannot download blocks, deliberate error`);
			}

			return expectedBlocksFromHeight(fromBlockHeight).slice(0, downloadChunkSize);
		};

		stub(communicator, "getPeerBlocks").callsFake(mockedGetPeerBlocks);

		const peers: Peer[] = [];
		for (let index = 0; index < maxParallelDownloads + 5; index++) {
			const peer = sandbox.app.resolve(Peer).init(`1.1.1.${index}`, 4000);
			peer.state = { header: {}, height: 12_500 };
			peer.verificationResult = { forked: false, highestCommonHeight: 2, hisHeight: 2, myHeight: 2 };

			peers.push(peer);
		}
		stub(repository, "getPeers").returnValue(peers);

		const fromHeight = 1;

		const downloadedBlocks = await blockDownloader.downloadBlocksFromHeight(fromHeight);
		const expectedBlocks = expectedBlocksFromHeight(fromHeight);

		console.log(downloadedBlocks.length, expectedBlocks.length);
		// assert.equal(downloadedBlocks, expectedBlocks);
	});

	it.only("#downloadBlocksFromHeight - should download blocks in parallel from all peers if less than N peers", async ({
		blockDownloader,
		sandbox,
	}) => {
		const maxParallelDownloads = 10;
		const downloadChunkSize = 400;
		const baseHeight = 50_000;

		const expectedBlocksFromHeight = (height) => {
			const blocks = [];
			for (let index = 0; index < maxParallelDownloads * downloadChunkSize; index++) {
				blocks.push({ height: height + 1 + index });
			}
			return blocks;
		};

		const mockedGetPeerBlocks = (peer, { fromBlockHeight }) => {
			if (fromBlockHeight + 1 === baseHeight) {
				throw new Error(`Cannot download blocks, deliberate error`);
			}

			return expectedBlocksFromHeight(fromBlockHeight).slice(0, downloadChunkSize);
		};

		stub(communicator, "getPeerBlocks").callsFake(mockedGetPeerBlocks);

		const numberPeers = maxParallelDownloads - 7;

		const peers = [];
		for (let index = 0; index < numberPeers; index++) {
			const peer = sandbox.app.resolve(Peer).init(`1.1.1.${index}`, 4000);
			peer.state = { header: {}, height: 12_500 };
			peer.verificationResult = { forked: false, highestCommonHeight: 2, hisHeight: 2, myHeight: 2 };

			peers.push(peer);
		}
		stub(repository, "getPeers").returnValue(peers);

		const fromHeight = 1;

		const downloadedBlocks = await blockDownloader.downloadBlocksFromHeight(fromHeight);
		const expectedBlocks = expectedBlocksFromHeight(fromHeight).slice(0, numberPeers * downloadChunkSize);

		console.log(downloadedBlocks.length, expectedBlocks.length);
		// assert.equal(downloadedBlocks, expectedBlocks);
	});

	it("#downloadBlocksFromHeight - should handle when getPeerBlocks throws", async ({ networkMonitor }) => {
		const maxParallelDownloads = 25;
		const downloadChunkSize = 400;
		const baseHeight = 50_000;

		const expectedBlocksFromHeight = (height) => {
			const blocks = [];
			for (let index = 0; index < maxParallelDownloads * downloadChunkSize; index++) {
				blocks.push({ height: height + 1 + index });
			}
			return blocks;
		};

		const mockedGetPeerBlocks = (peer, { fromBlockHeight }) => {
			if (fromBlockHeight + 1 === baseHeight) {
				throw new Error(`Cannot download blocks, deliberate error`);
			}

			return expectedBlocksFromHeight(fromBlockHeight).slice(0, downloadChunkSize);
		};

		const spyCommunicatorGetPeerBlocks = stub(communicator, "getPeerBlocks").callsFake(mockedGetPeerBlocks);

		const numberPeers = 5;

		const peers = [];
		for (let index = 0; index < numberPeers; index++) {
			const peer = new Peer(`1.1.1.${index}`, 4000);
			peer.state = {
				currentSlot: 2,
				forgingAllowed: true,
				header: {},
				height: baseHeight + numberPeers * downloadChunkSize,
			};
			peer.verificationResult = { forked: false, highestCommonHeight: 2, hisHeight: 2, myHeight: 2 };

			peers.push(peer);
		}
		stub(repository, "getPeers").returnValue(peers);

		const chunksToDownloadBeforeThrow = 2;
		let fromHeight = baseHeight - 1 - chunksToDownloadBeforeThrow * downloadChunkSize;

		let downloadedBlocks = await networkMonitor.downloadBlocksFromHeight(fromHeight, maxParallelDownloads);
		let expectedBlocks = expectedBlocksFromHeight(fromHeight).slice(
			0,
			chunksToDownloadBeforeThrow * downloadChunkSize,
		);

		assert.equal(downloadedBlocks, expectedBlocks);

		// when downloading the chunk triggering the throw, it will try to download from all the other peers
		// (so it will try (numPeers - 1) more times)
		spyCommunicatorGetPeerBlocks.calledTimes(numberPeers + (numberPeers - 1));

		for (let index = 0; index < numberPeers; index++) {
			if (index >= chunksToDownloadBeforeThrow && index < chunksToDownloadBeforeThrow + numberPeers) {
				spyCommunicatorGetPeerBlocks.calledNthWith(
					index,
					match.any,
					match.has("fromBlockHeight", fromHeight + chunksToDownloadBeforeThrow * downloadChunkSize),
				);
			} else {
				spyCommunicatorGetPeerBlocks.calledNthWith(
					index,
					match.any,
					match.has("fromBlockHeight", fromHeight + index * downloadChunkSize),
				);
			}
		}

		// See that the downloaded higher 2 chunks would be returned from the cache.
		spyCommunicatorGetPeerBlocks.reset();

		fromHeight = baseHeight - 1 + downloadChunkSize;

		downloadedBlocks = await networkMonitor.downloadBlocksFromHeight(fromHeight, maxParallelDownloads);
		expectedBlocks = expectedBlocksFromHeight(fromHeight).slice(0, numberPeers * downloadChunkSize);

		assert.equal(downloadedBlocks, expectedBlocks);

		const numberFailedChunks = 1;
		const numberCachedChunks = numberPeers - chunksToDownloadBeforeThrow - numberFailedChunks;

		spyCommunicatorGetPeerBlocks.calledTimes(numberPeers - numberCachedChunks);

		for (let index = 0; index < numberPeers - numberCachedChunks; index++) {
			spyCommunicatorGetPeerBlocks.calledNthWith(
				index,
				match.any,
				match.has("fromBlockHeight", fromHeight + (index + numberCachedChunks) * downloadChunkSize),
			);
		}
	});

	it("#downloadBlocksFromHeight - should handle when getPeerBlocks always throws", async ({ networkMonitor }) => {
		const maxParallelDownloads = 25;
		const downloadChunkSize = 400;
		stub(communicator, "getPeerBlocks").rejectedValue("always throwing");

		const numberPeers = 5;
		const baseHeight = 10_000;

		const peers = [];
		for (let index = 0; index < numberPeers; index++) {
			const peer = new Peer(`1.1.1.${index}`, 4000);
			peer.state = {
				currentSlot: 2,
				forgingAllowed: true,
				header: {},
				height: baseHeight + numberPeers * downloadChunkSize,
			};
			peer.verificationResult = { forked: false, highestCommonHeight: 2, hisHeight: 2, myHeight: 2 };

			peers.push(peer);
		}
		stub(repository, "getPeers").returnValue(peers);

		const chunksToDownload = 2;
		const fromHeight = baseHeight - 1 - chunksToDownload * downloadChunkSize;

		const downloadedBlocks = await networkMonitor.downloadBlocksFromHeight(fromHeight, maxParallelDownloads);

		assert.equal(downloadedBlocks, []);
	});

	it("#downloadBlocksFromHeight - should still download blocks from 1 peer if network height === our height", async ({
		networkMonitor,
	}) => {
		const maxParallelDownloads = 25;
		const mockBlock = { id: "123456" };

		stub(communicator, "getPeerBlocks").returnValue([mockBlock]);

		const peer = new Peer("1.1.1.1", 4000);
		peer.state = { currentSlot: 2, forgingAllowed: true, header: {}, height: 20 };
		peer.verificationResult = { forked: false, highestCommonHeight: 20, hisHeight: 20, myHeight: 20 };
		stub(repository, "getPeers").returnValue([peer]);

		assert.equal(await networkMonitor.downloadBlocksFromHeight(20, maxParallelDownloads), [mockBlock]);
	});

	it("#downloadBlocksFromHeight - should reduce download block chunk size after receiving no block", async ({
		sandbox,
		networkMonitor,
	}) => {
		const maxParallelDownloads = 25;
		const downloadChunkSize = 400;

		const chunkCache = sandbox.app.get<ChunkCache>(Identifiers.PeerChunkCache);
		// chunkCache.has = jest.fn().mockReturnValue(false);
		stub(chunkCache, "has").returnValue(false);

		const spyCommunicatorGetPeerBlocks = stub(communicator, "getPeerBlocks").returnValue([]);

		// communicator.getPeerBlocks = jest.fn().mockReturnValue([]);

		const numberPeers = maxParallelDownloads;
		const peers = [];
		for (let index = 0; index < maxParallelDownloads; index++) {
			const peer = new Peer(`1.1.1.${index}`, 4000);
			peer.state = { currentSlot: 1, forgingAllowed: true, header: {}, height: 1 };
			peer.state = {
				currentSlot: 2,
				forgingAllowed: true,
				header: {},
				height: numberPeers * downloadChunkSize,
			};
			peer.verificationResult = { forked: false, highestCommonHeight: 1, hisHeight: 1, myHeight: 1 };
			peers.push(peer);
		}
		stub(repository, "getPeers").returnValue(peers);

		const fromHeight = 1;

		// first step, peers won't return any block: chunk size should be reduced by factor 10 for next download
		for (const expectedBlockLimit of [400, 40, 4, 1, 1, 1]) {
			spyCommunicatorGetPeerBlocks.reset();
			const downloadedBlocks = await networkMonitor.downloadBlocksFromHeight(fromHeight, maxParallelDownloads);

			assert.equal(downloadedBlocks, []);
			// getPeerBlocks fails every time for every peer, so it will try for each peer
			// from all the other peers before reducing chunk size
			spyCommunicatorGetPeerBlocks.calledTimes(601); // TODO: Should be numPeers * maxParallelDownloads

			spyCommunicatorGetPeerBlocks.calledWith(match.any, {
				blockLimit: expectedBlockLimit,
				fromBlockHeight: match.number,
			});
		}

		const baseHeight = 50_000;

		const expectedBlocksFromHeight = (height) => {
			const blocks = [];
			for (let index = 0; index < maxParallelDownloads * downloadChunkSize; index++) {
				blocks.push({ height: height + 1 + index });
			}
			return blocks;
		};

		const mockedGetPeerBlocks = (peer, { fromBlockHeight }) => {
			if (fromBlockHeight + 1 === baseHeight) {
				throw new Error(`Cannot download blocks, deliberate error`);
			}

			return expectedBlocksFromHeight(fromBlockHeight).slice(0, downloadChunkSize);
		};

		spyCommunicatorGetPeerBlocks.callsFake((_, { fromBlockHeight }) => [
			expectedBlocksFromHeight(fromBlockHeight)[0],
		]);

		// second step, peers return blocks: chunk size should be reset to default value (400) for next download
		const mockGetPeerBlocks1Block = (_, { fromBlockHeight }) => [expectedBlocksFromHeight(fromBlockHeight)[0]];
		for (const expectedBlockLimit of [1, 400]) {
			spyCommunicatorGetPeerBlocks.callsFake(
				expectedBlockLimit === 1 ? mockGetPeerBlocks1Block : mockedGetPeerBlocks,
			);

			const downloadedBlocks = await networkMonitor.downloadBlocksFromHeight(fromHeight, maxParallelDownloads);

			const expectedBlocks = expectedBlocksFromHeight(fromHeight).slice(0, numberPeers * expectedBlockLimit);

			assert.equal(downloadedBlocks, expectedBlocks);

			// spyCommunicatorGetPeerBlocks.calledTimes(maxParallelDownloads); // TODO: Check

			spyCommunicatorGetPeerBlocks.calledWith(match.any, {
				blockLimit: expectedBlockLimit,
				fromBlockHeight: match.number,
			});
		}
	});
});
