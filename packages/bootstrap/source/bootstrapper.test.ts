import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";


import { describe } from "@mainsail/test-runner";
import { Bootstrapper } from "./bootstrapper";

describe<{
	app: Application;
	bootstrapper: Bootstrapper;
	configuration: any,
	commitFactory: any,
	stateStore: any,
	databaseService: any,
	snapshotImporter: any,
}>("Bootstrapper", ({ beforeEach, it, assert, spy, stub }) => {
	const genesisCommitJson = {}
	const genesisCommit = {
		block: {
			data: {
				hash: "aaaaa"
			},
			header: {
				parentHash: "0000000000000000000000000000000000000000000000000000000000000000"
			}
		}
	}

	beforeEach((context) => {
		context.configuration = {
			get: () => genesisCommitJson,
			getGenesisHeight: () => 1,
			getMilestone: () => {},
		}

		context.commitFactory = {
			fromJson: () => genesisCommit
		}

		context.stateStore = {
			setGenesisCommit: () => {},
			getGenesisCommit: () => genesisCommit
		}

		context.databaseService = {
			getBlock: () => undefined,
			isEmpty: () => true
		}

		context.snapshotImporter = {
			run: () => {},
		}

		const app = new Application();

		app.bind(Identifiers.Consensus.Service).toConstantValue({});
		app.bind(Identifiers.State.State).toConstantValue({});
		app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		app.bind(Identifiers.Validator.Repository).toConstantValue({});
		app.bind(Identifiers.P2P.Server).toConstantValue({});
		app.bind(Identifiers.P2P.Service).toConstantValue({});
		app.bind(Identifiers.Cryptography.Commit.Factory).toConstantValue(context.commitFactory);
		app.bind(Identifiers.Database.Service).toConstantValue(context.databaseService);
		app.bind(Identifiers.ValidatorSet.Service).toConstantValue({});
		app.bind(Identifiers.State.Store).toConstantValue(context.stateStore);
		app.bind(Identifiers.Processor.BlockProcessor).toConstantValue({});
		app.bind(Identifiers.Consensus.CommitState.Factory).toConstantValue({});
		app.bind(Identifiers.ApiSync.Service).toConstantValue({}); // Optional
		app.bind(Identifiers.Snapshot.Legacy.Importer).toConstantValue(context.snapshotImporter); // Optional
		app.bind(Identifiers.TransactionPool.Worker).toConstantValue({}); // Optional
		app.bind(Identifiers.Evm.Worker).toConstantValue({}); // Optional

		context.bootstrapper = app.resolve(Bootstrapper);
		context.app = app;


	});

	it.skip("should store genesis commit form configuration, and database is empty", async ({ bootstrapper, stateStore, databaseService }) => {
		const spyStoreSetGenesisCommit = spy(stateStore, "setGenesisCommit");
		const spyStoreGetGenesisCommit = spy(stateStore, "getGenesisCommit")
		const spyDatabaseServiceGetBlock = spy(databaseService, "getBlock");

		await bootstrapper.bootstrap();

		// #setGenesisCommit
		spyStoreSetGenesisCommit.calledOnce();
		spyStoreSetGenesisCommit.calledWith(genesisCommit);
		// #checkStoredGenesisCommit
		spyDatabaseServiceGetBlock.calledOnce();
		spyStoreGetGenesisCommit.neverCalled();
	})


	it("should throw if stored genesis block doesn't match genesis block from config", async ({ bootstrapper, stateStore, databaseService }) => {
		const spyStoreSetGenesisCommit = spy(stateStore, "setGenesisCommit");
		const spyStoreGetGenesisCommit = spy(stateStore, "getGenesisCommit")
		const spyDatabaseServiceGetBlock = stub(databaseService, "getBlock").returnValue({
			data: {
				hash: "bbbbb"
			}
		});

		await assert.rejects(() => bootstrapper.bootstrap(), "Block from crypto.json doesn't match stored genesis block");

		// #setGenesisCommit
		spyStoreSetGenesisCommit.calledOnce();
		spyStoreSetGenesisCommit.calledWith(genesisCommit);
		// #checkStoredGenesisCommit
		spyDatabaseServiceGetBlock.calledOnce();
		spyStoreGetGenesisCommit.calledOnce();
	})

	it("should throw if milestone.snapshot doesn't match genesis block parentHash", async ({ bootstrapper, stateStore, databaseService, configuration }) => {
		const spyStoreSetGenesisCommit = spy(stateStore, "setGenesisCommit");
		const spyStoreGetGenesisCommit = spy(stateStore, "getGenesisCommit")
		const spyDatabaseServiceGetBlock = spy(databaseService, "getBlock");
		const spyDatabaseServiceIsEmpty = spy(databaseService, "isEmpty");
		const spyGetMilestone = stub(configuration, "getMilestone").returnValue({
			snapshot: "abc"
		});

		await assert.rejects(() => bootstrapper.bootstrap(), "Previous block is set to snapshot, but there is no snapshot defined in milestones");

		// #setGenesisCommit
		spyStoreSetGenesisCommit.calledOnce();
		spyStoreSetGenesisCommit.calledWith(genesisCommit);
		// #checkStoredGenesisCommit
		spyDatabaseServiceGetBlock.calledOnce();
		// bootstrap
		spyDatabaseServiceIsEmpty.calledOnce();
		// #tryImportSnapshot
		spyStoreGetGenesisCommit.calledOnce();
		spyGetMilestone.calledOnce();
	})
});
