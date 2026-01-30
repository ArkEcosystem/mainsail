import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
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
	genesisCommit: Contracts.Crypto.Commit;
}>("DatabaseService", ({ it, afterAll, afterEach, beforeEach, assert }) => {
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
		const commitStateFactory = app.get<Contracts.Consensus.CommitStateFactory>(Identifiers.Consensus.CommitState.Factory);
		// const blockProcessor = app.get<Contracts.Processor.BlockProcessor>(Identifiers.Processor.BlockProcessor);
		const evm = app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");
		// const transactionHandler = app.get<Contracts.Transactions.TransactionHandler>(Identifiers.Transaction.Handler);

		const genesisCommitJson = configuration.get<Contracts.Crypto.CommitJson>("genesisBlock");
		const genesisCommit = await commitFactory.fromJson(genesisCommitJson);

		const commitState = commitStateFactory(genesisCommit);
		// const result = blockProcessor.process(commitState);

		const commitKey = {
			blockHash: genesisCommit.block.header.hash,
			blockNumber: BigInt(genesisCommit.block.header.number),
			round: BigInt(genesisCommit.block.header.round),
		}

		await evm.prepareNextCommit({ commitKey });
		await evm.onCommit(commitState);

		await context.databaseService.initialize();

		context.genesisCommit = genesisCommit;
	});

	afterEach(async (context) => {
		await context.evm.dispose();
	});

	it("#getState - should be ok", async ({ databaseService }) => {
		assert.equal(await databaseService.getState(), {
			blockNumber: 0, totalRound: 1
		})
	})

	it("#isEmpty - should be false", async ({ databaseService }) => {
		assert.false(await databaseService.isEmpty())
	})

	// it("#hasCommitByHash - should be true", async ({ databaseService, genesisCommit }) => {
	// 	assert.true(await databaseService.hasCommitByHash(genesisCommit.block.header.hash))
	// })

	it("#findCommitBuffers - should return commit buffer", async ({ databaseService, genesisCommit }) => {
		assert.equal(await databaseService.findCommitBuffers(0,1), [Buffer.from(genesisCommit.serialized, "hex")]);
	})

	it("#getBlock - should return block", async ({ databaseService, genesisCommit }) => {
		assert.equal((await databaseService.getBlock(0))?.header.hash, genesisCommit.block.header.hash);
	})

	// it("#getBlockByHash - should return block", async ({ databaseService, genesisCommit }) => {
	// 	console.log(await databaseService.getBlockByHash(genesisCommit.block.header.hash));
	// 	// assert.equal((await databaseService.getBlock(0))?.header.hash, genesisCommit.block.header.hash);
	// })

	it("#getBlockByHash - should return block header", async ({ databaseService, genesisCommit }) => {
		assert.equal((await databaseService.getBlockHeader(0)), genesisCommit.block.header);
	})

	// it("#getBlockHeaderByHash - should return block header", async ({ databaseService, genesisCommit }) => {
	// 	// console.log(await databaseService.getBlockHeaderByHash(genesisCommit.block.header.hash));
	// 	assert.equal((await databaseService.getBlockHeaderByHash(0)), genesisCommit.block.header);
	// })

	it("#findBlocks - should return blocks", async ({ databaseService, genesisCommit }) => {
		assert.equal((await databaseService.findBlocks(0, 1)), [genesisCommit.block]);
	})

	it("#readCommits - should return commits", async ({ databaseService, genesisCommit }) => {
        const commits = [];
        for await (const commit of databaseService.readCommits(0, 1)) {
            commits.push(commit);
        }
		assert.equal(commits.map(c => c.block.data.hash), [genesisCommit.block.data.hash]);
	})

	it("#getLastCommit - should return last commit", async ({ databaseService, genesisCommit }) => {
		assert.equal((await databaseService.getLastCommit()).block.header.hash, genesisCommit.block.header.hash);
	})


	it("#onCommit - should set blockNumber and increase totalRound", async ({ databaseService, genesisCommit }) => {
		const commit = {
			block: {
				data: {
					number: 3
				}
			},
			proof: {
				round: 1
			}
		}

		const unit: any = {
			getCommit: () => commit
		}

		assert.equal(databaseService.getState(), {
			blockNumber: 0,
			totalRound: 1
		})

		await databaseService.onCommit(unit);

		assert.equal(databaseService.getState(), {
			blockNumber: 3,
			totalRound: 3
		})
	})
});
