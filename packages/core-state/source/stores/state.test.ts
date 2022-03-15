import { Container } from "@arkecosystem/core-kernel";
import { Factories } from "@arkecosystem/core-test-framework";
import { describe } from "@arkecosystem/core-test-framework";
import { Interfaces } from "@arkecosystem/crypto";
import { SinonSpy } from "sinon";

import { makeChainedBlocks } from "../../test/make-chained-block";
import { setUp } from "../../test/setup";
import { StateStore } from "./";

describe<{
	blocks: Interfaces.IBlock[];
	stateStorage: StateStore;
	factory: Factories.FactoryBuilder;
	logger: SinonSpy;
	dispatchSpy: SinonSpy;
}>("StateStore", ({ it, beforeEach, afterEach, assert, spy, clock }) => {
	beforeEach(async (context) => {
		const env = await setUp();

		context.factory = env.factory;
		context.logger = env.spies.logger.info;
		context.dispatchSpy = env.spies.dispatchSpy;
		context.stateStorage = env.sandbox.app.get(Container.Identifiers.StateStore);
		context.blocks = makeChainedBlocks(101, context.factory.get("Block"));
	});

	afterEach((context) => {
		context.logger.resetHistory();
		context.dispatchSpy.resetHistory();
	});

	it("getBlockchain - should return initial state", (context) => {
		assert.equal(context.stateStorage.getBlockchain(), {});
	});

	it("setBlockchain - should set blockchain state", (context) => {
		const state = {
			value: "dummy_state",
		};

		context.stateStorage.setBlockchain(state);
		assert.equal(context.stateStorage.getBlockchain(), state);
	});

	it("isStarted - should be false by default", (context) => {
		assert.false(context.stateStorage.isStarted());
	});

	it("setStarted - should set value", (context) => {
		context.stateStorage.setStarted(true);

		assert.true(context.stateStorage.isStarted());
	});

	it("getForkedBlock - should be undefined by default", (context) => {
		assert.undefined(context.stateStorage.getForkedBlock());
	});

	it("setForkedBlock - should set forkedBlock", (context) => {
		const block = {
			id: "dummy_id",
		};
		// @ts-ignore
		context.stateStorage.setForkedBlock(block);
		assert.equal(context.stateStorage.getForkedBlock(), block);
	});

	it("clearForkedBlock - should clear forkedBlock", (context) => {
		const block = {
			id: "dummy_id",
		};
		// @ts-ignore
		context.stateStorage.setForkedBlock(block);
		assert.equal(context.stateStorage.getForkedBlock(), block);

		context.stateStorage.clearForkedBlock();
		assert.undefined(context.stateStorage.getForkedBlock());
	});

	it("getNoBlockCounter - should return 0 by default", (context) => {
		assert.equal(context.stateStorage.getNoBlockCounter(), 0);
	});

	it("setNoBlockCounter - should set noBlockCounter", (context) => {
		context.stateStorage.setNoBlockCounter(3);
		assert.equal(context.stateStorage.getNoBlockCounter(), 3);
	});

	it("getP2pUpdateCounter - should return 0 by default", (context) => {
		assert.equal(context.stateStorage.getP2pUpdateCounter(), 0);
	});

	it("setP2pUpdateCounter - should set p2pUpdateCounter", (context) => {
		context.stateStorage.setP2pUpdateCounter(3);
		assert.equal(context.stateStorage.getP2pUpdateCounter(), 3);
	});

	it("getNumberOfBlocksToRollback - should return 0 by default", (context) => {
		assert.equal(context.stateStorage.getNumberOfBlocksToRollback(), 0);
	});

	it("setNumberOfBlocksToRollback - should set numberOfBlocksToRollback", (context) => {
		context.stateStorage.setNumberOfBlocksToRollback(3);
		assert.equal(context.stateStorage.getNumberOfBlocksToRollback(), 3);
	});

	it("getNetworkStart - should return false by default", (context) => {
		assert.false(context.stateStorage.getNetworkStart());
	});

	it("setNetworkStart - should set networkStart", (context) => {
		context.stateStorage.setNetworkStart(true);
		assert.true(context.stateStorage.getNetworkStart());
	});

	it("getRestoredDatabaseIntegrity - should return false by default", (context) => {
		assert.false(context.stateStorage.getRestoredDatabaseIntegrity());
	});

	it("setRestoredDatabaseIntegrity - should set restoredDatabaseIntegrity", (context) => {
		context.stateStorage.setRestoredDatabaseIntegrity(true);
		assert.true(context.stateStorage.getRestoredDatabaseIntegrity());
	});

	it("getMaxLastBlocks - should return max last blocks limit", (context) => {
		assert.equal(context.stateStorage.getMaxLastBlocks(), 100);
	});

	it("getLastHeight - should return the last block height", (context) => {
		context.stateStorage.setLastBlock(context.blocks[0]);
		context.stateStorage.setLastBlock(context.blocks[1]);

		assert.equal(context.stateStorage.getLastHeight(), context.blocks[1].data.height);
	});

	it("getLastBlock - should throw when there is no last block", (context) => {
		// TODO: check that we now prefer this to throw than toBeUndefined()?
		assert.throws(() => context.stateStorage.getLastBlock());
	});

	it("getLastBlock - should return the last block", (context) => {
		context.stateStorage.setLastBlock(context.blocks[0]);
		context.stateStorage.setLastBlock(context.blocks[1]);

		assert.equal(context.stateStorage.getLastBlock(), context.blocks[1]);
	});

	it("setLastBlock - should set the last block", (context) => {
		context.stateStorage.setLastBlock(context.blocks[0]);
		assert.equal(context.stateStorage.getLastBlock(), context.blocks[0]);
	});

	it("setLastBlock - should not exceed the max last blocks", (context) => {
		for (let i = 0; i < 100; i++) {
			// 100 is default
			context.stateStorage.setLastBlock(context.blocks[i]);
		}

		assert.length(context.stateStorage.getLastBlocks(), 100);
		assert.equal(context.stateStorage.getLastBlock(), context.blocks[99]);
		assert.equal(context.stateStorage.getLastBlocks().slice(-1)[0], context.blocks[0]);

		// Push one more to remove the first last block.
		context.stateStorage.setLastBlock(context.blocks[100]);

		assert.length(context.stateStorage.getLastBlocks(), 100);
		assert.equal(context.stateStorage.getLastBlock(), context.blocks[100]);
		assert.equal(context.stateStorage.getLastBlocks().slice(-1)[0], context.blocks[1]);
	});

	it("setLastBlock - should remove last blocks when going to lower height", (context) => {
		for (let i = 0; i < 100; i++) {
			// 100 is default
			context.stateStorage.setLastBlock(context.blocks[i]);
		}

		assert.length(context.stateStorage.getLastBlocks(), 100);
		assert.equal(context.stateStorage.getLastBlock(), context.blocks[99]);

		// Set last height - 1
		context.stateStorage.setLastBlock(context.blocks[98]);

		assert.length(context.stateStorage.getLastBlocks(), 99);
		assert.equal(context.stateStorage.getLastBlock(), context.blocks[98]);

		// Set to first block
		context.stateStorage.setLastBlock(context.blocks[0]);
		assert.length(context.stateStorage.getLastBlocks(), 1);
		assert.equal(context.stateStorage.getLastBlock(), context.blocks[0]);
	});

	it("getLastBlocks - should return the last blocks", (context) => {
		for (let i = 0; i < 5; i++) {
			context.stateStorage.setLastBlock(context.blocks[i]);
		}

		const lastBlocks = context.stateStorage.getLastBlocks();
		assert.length(lastBlocks, 5);

		for (let i = 0; i < 5; i++) {
			assert.equal(lastBlocks[i].data.height, 6 - i); // Height started at 2
			assert.equal(lastBlocks[i], context.blocks[4 - i]);
		}
	});

	it("getLastBlocksData - should return the last blocks data", (context) => {
		for (let i = 0; i < 5; i++) {
			context.stateStorage.setLastBlock(context.blocks[i]);
		}

		const lastBlocksData = context.stateStorage.getLastBlocksData().toArray() as Interfaces.IBlockData[];
		assert.length(lastBlocksData, 5);

		for (let i = 0; i < 5; i++) {
			assert.equal(lastBlocksData[i].height, 6 - i); // Height started at 2
			assert.true(lastBlocksData[i].hasOwnProperty("transactions"));
			delete lastBlocksData[i].transactions;
			assert.equal(lastBlocksData[i], context.blocks[4 - i].data);
		}
	});

	it("getLastBlocksData - should return last blocks data with headers only", (context) => {
		for (let i = 0; i < 5; i++) {
			context.stateStorage.setLastBlock(context.blocks[i]);
		}

		const lastBlocksData = context.stateStorage.getLastBlocksData(true).toArray() as Interfaces.IBlockData[];

		assert.length(lastBlocksData, 5);
	});

	it("getLastBlocksData - should return last blocks which have transactions", (context) => {
		for (let i = 0; i < 5; i++) {
			context.blocks[i].transactions = [
				// @ts-ignore
				{
					id: "test",
				},
			];
			context.stateStorage.setLastBlock(context.blocks[i]);
		}

		const lastBlocksData = context.stateStorage.getLastBlocksData().toArray() as Interfaces.IBlockData[];

		assert.length(lastBlocksData, 5);
	});

	it("getLastBlocksData - should handle milestones", (context) => {
		context.blocks[0].data.height = 1;
		context.stateStorage.setLastBlock(context.blocks[0]);

		assert.true(context.dispatchSpy.calledWith("crypto.milestone.changed"));
	});

	it("getLastBlockIds - should return the last blocks data", (context) => {
		for (let i = 0; i < 5; i++) {
			context.stateStorage.setLastBlock(context.blocks[i]);
		}

		const lastBlockIds = context.stateStorage.getLastBlockIds();
		assert.length(lastBlockIds, 5);

		for (let i = 0; i < 5; i++) {
			assert.equal(lastBlockIds[i], context.blocks[4 - i].data.id);
		}
	});

	it("getGenesisBlock - should set and get the genesis block", (context) => {
		const genesisBlock = context.blocks[0];
		assert.not.throws(() => context.stateStorage.setGenesisBlock(genesisBlock));
		assert.equal(context.stateStorage.getGenesisBlock(), genesisBlock);
	});

	it("getLastBlocksByHeight - should return the last blocks data", (context) => {
		for (let i = 0; i < 100; i++) {
			context.stateStorage.setLastBlock(context.blocks[i]);
		}

		const lastBlocksByHeight = context.stateStorage.getLastBlocksByHeight(0, 101);
		assert.length(lastBlocksByHeight, 100);
		assert.equal(lastBlocksByHeight[0].height, context.blocks[0].data.height);
	});

	it("getLastBlocksByHeight - should return one last block if no end height", (context) => {
		for (let i = 0; i < 100; i++) {
			context.stateStorage.setLastBlock(context.blocks[i]);
		}

		const lastBlocksByHeight = context.stateStorage.getLastBlocksByHeight(50);
		assert.length(lastBlocksByHeight, 1);
		assert.equal(lastBlocksByHeight[0].height, 50);
	});

	it("getLastBlocksByHeight - should return full blocks and block headers", (context) => {
		// TODO: should use the factory and inject transactions
		context.stateStorage.setLastBlock(context.blocks[0]);

		let lastBlocksByHeight = context.stateStorage.getLastBlocksByHeight(2, 2, true);
		assert.length(lastBlocksByHeight, 1);
		assert.equal(lastBlocksByHeight[0].height, 2);
		assert.undefined(lastBlocksByHeight[0].transactions);

		lastBlocksByHeight = context.stateStorage.getLastBlocksByHeight(2, 2);
		assert.length(lastBlocksByHeight, 1);
		assert.equal(lastBlocksByHeight[0].height, 2);
		assert.length(lastBlocksByHeight[0].transactions, 0);
	});

	it("get/setLastDownloadedBlock - should return undefined if last downloaded block is not set", (context) => {
		assert.undefined(context.stateStorage.getLastDownloadedBlock());
	});

	it("get/setLastDownloadedBlock - should set and get last downloaded block", (context) => {
		const blockData = context.blocks[0].data;
		context.stateStorage.setLastDownloadedBlock(blockData);
		assert.equal(context.stateStorage.getLastDownloadedBlock(), blockData);
	});

	it("get/setLastStoredBlockHeight - should return undefined if last stored block is not set", (context) => {
		assert.equal(context.stateStorage.getLastStoredBlockHeight(), 1);
	});

	it("get/setLastStoredBlockHeight - should set and get last downloaded block", (context) => {
		context.stateStorage.setLastStoredBlockHeight(10);
		assert.equal(context.stateStorage.getLastStoredBlockHeight(), 10);
	});

	it("getCommonBlocks - should get common blocks", (context) => {
		for (let i = 0; i < 100; i++) {
			context.stateStorage.setLastBlock(context.blocks[i]);
		}

		// Heights 90 - 100
		const ids = context.blocks.slice(89, 99).map((block) => block.data.id);
		const commonBlocks = context.stateStorage.getCommonBlocks(ids);
		assert.length(ids, 10);
		assert.length(commonBlocks, 10);

		for (const [i, commonBlock] of commonBlocks.entries()) {
			assert.equal(commonBlock.height, context.blocks[98 - i].data.height);
		}
	});

	it("cacheTransactions - should add transaction id", (context) => {
		assert.equal(context.stateStorage.cacheTransactions([{ id: "1" } as Interfaces.ITransactionData]), {
			added: [{ id: "1" }],
			notAdded: [],
		});
		assert.length(context.stateStorage.getCachedTransactionIds(), 1);
	});

	it("cacheTransactions - should not add duplicate transaction ids", (context) => {
		assert.equal(context.stateStorage.cacheTransactions([{ id: "1" } as Interfaces.ITransactionData]), {
			added: [{ id: "1" }],
			notAdded: [],
		});
		assert.equal(context.stateStorage.cacheTransactions([{ id: "1" } as Interfaces.ITransactionData]), {
			added: [],
			notAdded: [{ id: "1" }],
		});
		assert.length(context.stateStorage.getCachedTransactionIds(), 1);
	});

	it("cacheTransactions - should not add more than 10000 unique transaction ids", (context) => {
		const transactions = [];
		for (let i = 0; i < 10_000; i++) {
			transactions.push({ id: i.toString() });
		}

		assert.equal(context.stateStorage.cacheTransactions(transactions), {
			added: transactions,
			notAdded: [],
		});

		assert.length(context.stateStorage.getCachedTransactionIds(), 10_000);
		assert.equal(context.stateStorage.getCachedTransactionIds()[0], "0");

		assert.equal(context.stateStorage.cacheTransactions([{ id: "10000" } as any]), {
			added: [{ id: "10000" }],
			notAdded: [],
		});
		assert.length(context.stateStorage.getCachedTransactionIds(), 10_000);
		assert.equal(context.stateStorage.getCachedTransactionIds()[0], "1");
	});

	it("clearCachedTransactionIds - should remove cached transaction ids", (context) => {
		const transactions = [];
		for (let i = 0; i < 10; i++) {
			transactions.push({ id: i.toString() });
		}

		assert.equal(context.stateStorage.cacheTransactions(transactions), {
			added: transactions,
			notAdded: [],
		});

		assert.length(context.stateStorage.getCachedTransactionIds(), 10);
		context.stateStorage.clearCachedTransactionIds();
		assert.length(context.stateStorage.getCachedTransactionIds(), 0);
	});

	it("reset - should reset initial blockchain state", (context) => {
		const mockBlockChainMachine = {
			initialState: "mock",
		};
		context.stateStorage.reset(mockBlockChainMachine);

		assert.equal(context.stateStorage.getBlockchain(), mockBlockChainMachine.initialState);
	});

	it("pingBlock - should return false if there is no blockPing", (context) => {
		// @ts-ignore
		context.stateStorage.blockPing = undefined;
		assert.false(context.stateStorage.pingBlock(context.blocks[5].data));
	});

	it("pingBlock - should return true if block pinged == current blockPing and should update stats", async (context) => {
		const timer = clock();
		const currentTime = Date.now();

		// @ts-ignore
		context.stateStorage.blockPing = {
			count: 1,
			first: currentTime,
			last: currentTime,
			block: context.blocks[5].data,
		};

		timer.tick(100);

		assert.true(context.stateStorage.pingBlock(context.blocks[5].data));

		const blockPing = context.stateStorage.getBlockPing()!;
		assert.equal(blockPing.count, 2);
		assert.equal(blockPing.block, context.blocks[5].data);
		assert.true(blockPing.last > currentTime);
		assert.equal(blockPing.first, currentTime);
	});

	it("pingBlock - should return false if block pinged != current blockPing", (context) => {
		const currentTime = Date.now();
		// @ts-ignore
		context.stateStorage.blockPing = {
			count: 1,
			first: currentTime,
			last: currentTime,
			block: context.blocks[3].data,
		};
		assert.false(context.stateStorage.pingBlock(context.blocks[5].data));

		const blockPing = context.stateStorage.getBlockPing()!;
		assert.equal(blockPing.count, 1);
		assert.equal(blockPing.block, context.blocks[3].data);
		assert.equal(blockPing.last, currentTime);
		assert.equal(blockPing.first, currentTime);
	});

	it("pushPingBlock - should push the block provided as blockPing", (context) => {
		// @ts-ignore
		context.stateStorage.blockPing = undefined;

		context.stateStorage.pushPingBlock(context.blocks[5].data);

		const blockPing = context.stateStorage.getBlockPing()!;
		assert.object(blockPing);
		assert.equal(blockPing.block, context.blocks[5].data);
		assert.equal(blockPing.count, 1);
	});

	it("pushPingBlock - should log info message if there is already a blockPing", async (context) => {
		// @ts-ignore
		context.stateStorage.blockPing = {
			count: 1,
			first: Date.now(),
			last: Date.now(),
			block: context.blocks[3].data,
		};

		context.stateStorage.pushPingBlock(context.blocks[5].data);
		assert.true(
			context.logger.calledWith(
				`Previous block ${context.blocks[3].data.height.toLocaleString()} pinged blockchain 1 times`,
			),
		);

		const blockPing = context.stateStorage.getBlockPing()!;
		assert.object(blockPing);
		assert.equal(blockPing.block, context.blocks[5].data);
		assert.equal(blockPing.count, 1);
	});

	it("pushPingBlock - should log info message if there is already a blockPing when pushed fromForger", async (context) => {
		// @ts-ignore
		context.stateStorage.blockPing = {
			count: 0,
			first: Date.now(),
			last: Date.now(),
			block: context.blocks[3].data,
		};

		context.stateStorage.pushPingBlock(context.blocks[5].data, true);
		assert.true(
			context.logger.calledWith(
				`Previous block ${context.blocks[3].data.height.toLocaleString()} pinged blockchain 0 times`,
			),
		);

		const blockPing = context.stateStorage.getBlockPing()!;
		assert.object(blockPing);
		assert.equal(blockPing.block, context.blocks[5].data);
		assert.equal(blockPing.count, 0);
	});

	it("isWakeUpTimeoutSet - should return false if timer is not set", async (context) => {
		assert.false(context.stateStorage.isWakeUpTimeoutSet());
	});

	it("isWakeUpTimeoutSet - should return true if timer is set", async (context) => {
		const timer = clock();

		context.stateStorage.setWakeUpTimeout(() => {}, 100);

		assert.true(context.stateStorage.isWakeUpTimeoutSet());

		timer.tick(200);

		assert.false(context.stateStorage.isWakeUpTimeoutSet());
	});

	it("setWakeUpTimeout - should call callback and clear timeout", async (context) => {
		const timer = clock();

		const spyFn = spy(() => {});
		const spyOnClearWakeUpTimeout = spy(context.stateStorage, "clearWakeUpTimeout");

		context.stateStorage.setWakeUpTimeout(() => {}, 100);

		timer.tick(200);

		spyFn.calledOnce();
		spyOnClearWakeUpTimeout.calledOnce();
	});

	it("clearWakeUpTimeout - should clear wake up timers", (context) => {
		const timer = clock();
		const timeoutSpy = spy(timer, "clearTimeout");

		// @ts-ignore
		context.stateStorage.wakeUpTimeout = 1;

		context.stateStorage.clearWakeUpTimeout();

		// @ts-ignore
		assert.undefined(context.stateStorage.wakeUpTimeout);
		timeoutSpy.calledOnce();
	});

	it("clearWakeUpTimeout - should do nothing if a timer is not set", (context) => {
		const timer = clock();
		const timeoutSpy = spy(timer, "clearTimeout");

		context.stateStorage.clearWakeUpTimeout();
		timeoutSpy.neverCalled();
	});
});
