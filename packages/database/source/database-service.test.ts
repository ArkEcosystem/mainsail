import type { Contracts } from "@mainsail/contracts";
import { Identifiers, Enums } from "@mainsail/constants";
import { EvmInstance } from "@mainsail/evm-service/distribution/instances/index.js";

import { DatabaseService } from "../source/database-service";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { setGracefulCleanup } from "tmp";

describe<{
	app: Application;
	evm: Contracts.Evm.Instance;
	databaseService: Contracts.Database.DatabaseService;
}>("DatabaseService - empty", ({ it, afterAll, afterEach, beforeEach, assert }) => {
	afterAll(() => setGracefulCleanup());

	afterEach(async (context) => {
		await context.evm.dispose();
	});

	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.app.bind(Identifiers.Evm.Instance).to(EvmInstance).inSingletonScope().whenTagged("instance", "evm");

		context.evm = context.app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");

		context.databaseService = context.app.resolve(DatabaseService);
		await context.databaseService.initialize();
	});

	it("getState - should be ok", async ({ databaseService }) => {
		const state = databaseService.getState();
		assert.equal(state, {
			blockNumber: 0,
			totalRound: 0,
		});
	});

	it("isEmpty - should be ok", async ({ databaseService }) => {
		assert.true(await databaseService.isEmpty());
	});

	it("getLastCommit - should throw when empty", async ({ databaseService }) => {
		await assert.rejects(async () => databaseService.getLastCommit(), "Database is empty");
	});

	it("hasCommitByHash - should be ok", async ({ databaseService }) => {
		const result = await databaseService.hasCommitByHash(
			"0000000000000000000000000000000000000000000000000000000000000000",
		);
		assert.false(result);
	});

	it("getBlock - should be ok", async ({ databaseService }) => {
		const block = await databaseService.getBlock(0);
		assert.undefined(block);
	});

	it("getBlockByHash - should be ok", async ({ databaseService }) => {
		const block = await databaseService.getBlockByHash(
			"0000000000000000000000000000000000000000000000000000000000000000",
		);
		assert.undefined(block);
	});

	it("getBlockHeader - should be ok", async ({ databaseService }) => {
		const block = await databaseService.getBlockHeader(0);
		assert.undefined(block);
	});

	it("getBlockHeaderByHash - should be ok", async ({ databaseService }) => {
		const block = await databaseService.getBlockHeaderByHash(
			"0000000000000000000000000000000000000000000000000000000000000000",
		);
		assert.undefined(block);
	});

	it("findBlocks - should be ok", async ({ databaseService }) => {
		const blocks = await databaseService.findBlocks(1, 2);
		assert.empty(blocks);
	});

	it("findCommitBuffers - should be ok", async ({ databaseService }) => {
		const commits = await databaseService.findCommitBuffers(1, 2);
		assert.empty(commits);
	});

	it("readCommits - should be ok", async ({ databaseService }) => {
		const commits = [];
		for await (const commit of databaseService.readCommits(1, 2)) {
			commits.push(commit);
		}

		assert.empty(commits);
	});

	it("onCommit - should be ok", async ({ databaseService }) => {
		assert.equal(databaseService.getState(), {
			blockNumber: 0,
			totalRound: 0,
		});

		await databaseService.onCommit({
			getCommit: async () => ({
				block: { number: 2 },
				proof: { round: 0 },
			}),
		} as Contracts.Processor.ProcessableUnit);

		assert.equal(databaseService.getState(), {
			blockNumber: 2,
			totalRound: 1,
		});
	});

	it("getTransactionByHash - should be ok", async ({ databaseService }) => {
		const transaction = await databaseService.getTransactionByHash(
			"0000000000000000000000000000000000000000000000000000000000000000",
		);
		assert.undefined(transaction);
	});

	it("getTransactionByBlockHashAndIndex - should be ok", async ({ databaseService }) => {
		const transaction = await databaseService.getTransactionByBlockHashAndIndex(
			"0000000000000000000000000000000000000000000000000000000000000000",
			0,
		);
		assert.undefined(transaction);
	});

	it("getTransactionByBlockNumberAndIndex - should be ok", async ({ databaseService }) => {
		const transaction = await databaseService.getTransactionByBlockNumberAndIndex(1, 0);
		assert.undefined(transaction);
	});
});

describe<{
	app: Application;
	evm: Contracts.Evm.Instance;
	databaseService: Contracts.Database.DatabaseService;
	genesisCommit: Contracts.Crypto.Commit;
}>("DatabaseService - genesis block", ({ it, afterAll, afterEach, beforeEach, assert }) => {
	afterAll(() => setGracefulCleanup());

	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.app.bind(Identifiers.Evm.Instance).to(EvmInstance).inSingletonScope().whenTagged("instance", "evm");

		context.evm = context.app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");

		context.databaseService = context.app.resolve(DatabaseService);
		await context.databaseService.initialize();

		const app = context.app;
		const configuration = app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
		const commitFactory = app.get<Contracts.Crypto.CommitFactory>(Identifiers.Cryptography.Commit.Factory);
		const commitStateFactory = app.get<Contracts.Consensus.CommitStateFactory>(
			Identifiers.Consensus.CommitState.Factory,
		);

		const evm = app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");

		const genesisCommitJson = configuration.getGenesisCommit();
		const genesisCommit = await commitFactory.fromJson(genesisCommitJson);

		const commitState = commitStateFactory(genesisCommit);

		const commitKey = {
			blockHash: genesisCommit.block.hash,
			blockNumber: BigInt(genesisCommit.block.number),
			round: BigInt(genesisCommit.block.round),
		};

		await evm.initializeGenesis({
			deployerAccount: "0x0000000000000000000000000000000000000001",
			initialBlockNumber: 0n,
			initialSupply: 10000000000000000000000000000n,
			account: genesisCommit.block.proposer,
			validatorContract: "0x0000000000000000000000000000000000000001",
			usernameContract: "0x0000000000000000000000000000000000000001",
		});

		await evm.prepareNextCommit({
			blockContext: {
				commitKey,
				gasLimit: BigInt("10000000"),
				timestamp: BigInt(genesisCommit.block.timestamp),
				validatorAddress: genesisCommit.block.proposer,
			},
		});

		for (const transaction of genesisCommit.block.transactions) {
			const { receipt } = await evm.process({
				commitKey,
				data: Buffer.from(transaction.data.slice(2), "hex"),
				from: transaction.from,
				gasLimit: BigInt(transaction.gasLimit),
				gasPrice: BigInt(transaction.gasPrice),
				nonce: transaction.nonce,
				specId: Enums.Evm.SpecId.LATEST,
				to: transaction.to,
				txHash: transaction.hash,
				value: transaction.value,
			});

			if (receipt.status !== 1) {
				throw new Error("Can't process transaction");
			}
		}

		await evm.onCommit(commitState);

		await context.databaseService.initialize();

		context.genesisCommit = genesisCommit;
	});

	afterEach(async (context) => {
		await context.evm.dispose();
	});

	it("#getState - should be ok", async ({ databaseService }) => {
		assert.equal(await databaseService.getState(), {
			blockNumber: 0,
			totalRound: 1,
		});
	});

	it("#isEmpty - should be false", async ({ databaseService }) => {
		assert.false(await databaseService.isEmpty());
	});

	it("#hasCommitByHash - should be true", async ({ databaseService, genesisCommit }) => {
		assert.true(await databaseService.hasCommitByHash(genesisCommit.block.hash));
	});

	it("#findCommitBuffers - should return commit buffer", async ({ databaseService, genesisCommit }) => {
		assert.equal(await databaseService.findCommitBuffers(0, 1), [Buffer.from(genesisCommit.serialized, "hex")]);
	});

	it("#getBlock - should return block", async ({ databaseService, genesisCommit }) => {
		assert.equal((await databaseService.getBlock(0))?.hash, genesisCommit.block.hash);
	});

	it("#getBlockByHash - should return block", async ({ databaseService, genesisCommit }) => {
		assert.equal((await databaseService.getBlock(0))?.hash, genesisCommit.block.hash);
	});

	it("#getBlockHeader - should return block header", async ({ databaseService, genesisCommit }) => {
		const { transactions: _, serialized: __, ...header } = genesisCommit.block;
		assert.equal(await databaseService.getBlockHeader(0), header);
	});

	it("#getBlockHeaderByHash - should return block header", async ({ databaseService, genesisCommit }) => {
		const { transactions: _, serialized: __, ...header } = genesisCommit.block;
		assert.equal(await databaseService.getBlockHeaderByHash(genesisCommit.block.hash), header);
	});

	it("#findBlocks - should return blocks", async ({ databaseService, genesisCommit }) => {
		for (let i = 0; i < genesisCommit.block.transactions.length; i++) {
			assert.equal(
				(await databaseService.findBlocks(0, 1))[0].transactions[i],
				genesisCommit.block.transactions[i],
			);
		}
	});

	it("#readCommits - should return commits", async ({ databaseService, genesisCommit }) => {
		const commits = [];
		for await (const commit of databaseService.readCommits(0, 1)) {
			commits.push(commit);
		}
		assert.equal(
			commits.map((c) => c.block.hash),
			[genesisCommit.block.hash],
		);
	});

	it("#readCommits - throws when start is greater than end", async ({ databaseService }) => {
		await assert.rejects(() => databaseService.readCommits(5, 0, 1).next(), "start must be <= end");
	});

	it("#readCommits - throws when maxBytes is not positive", async ({ databaseService }) => {
		await assert.rejects(() => databaseService.readCommits(0, 5, 0).next(), "maxBytes must be > 0");
	});

	it("#getLastCommit - should return last commit", async ({ databaseService, genesisCommit }) => {
		assert.equal((await databaseService.getLastCommit()).block.hash, genesisCommit.block.hash);
	});

	it("#onCommit - should set blockNumber and increase totalRound", async ({ databaseService, genesisCommit }) => {
		const commit = {
			block: {
				number: 3,
			},
			proof: {
				round: 1,
			},
		};

		const unit: any = {
			getCommit: () => commit,
		};

		assert.equal(databaseService.getState(), {
			blockNumber: 0,
			totalRound: 1,
		});

		await databaseService.onCommit(unit);

		assert.equal(databaseService.getState(), {
			blockNumber: 3,
			totalRound: 3,
		});
	});

	// TODO: Check all fields are matching
	it("#getTransactionByHash - should return transaction", async ({ databaseService, genesisCommit }) => {
		assert.equal(
			(await databaseService.getTransactionByHash(genesisCommit.block.transactions[0].hash))?.hash,
			genesisCommit.block.transactions[0].hash,
		);
	});

	it("#getTransactionByBlockHashAndIndex - should return transaction", async ({ databaseService, genesisCommit }) => {
		assert.equal(
			(await databaseService.getTransactionByBlockHashAndIndex(genesisCommit.block.hash, 0))?.hash,
			genesisCommit.block.transactions[0].hash,
		);
	});

	it("#getTransactionByBlockNumberAndIndex - should return transaction", async ({
		databaseService,
		genesisCommit,
	}) => {
		assert.equal(
			(await databaseService.getTransactionByBlockNumberAndIndex(0, 0))?.hash,
			genesisCommit.block.transactions[0].hash,
		);
	});
});
