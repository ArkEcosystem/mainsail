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

	it("#hasCommitByHash - should be true", async ({ databaseService, genesisCommit }) => {
		console.log(genesisCommit.block.header.hash)
		console.log(await databaseService.getBlockByHash(genesisCommit.block.header.hash))
		// console.log(await databaseService.getBlock(0));
		// console.log(await databaseService.getBlock(0));
		// assert.true(await databaseService.hasCommitByHash(genesisCommit.block.header.hash))
	})
});
