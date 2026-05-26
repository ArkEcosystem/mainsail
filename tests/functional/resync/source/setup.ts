import { TypeOrm } from "@mainsail/api-database";
import { EnvironmentVariables, Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { Application, Bootstrap, Providers, Services } from "@mainsail/kernel";
import { resolve } from "path";

import { PoolWorker } from "./pool-worker.js";
import { Worker } from "./worker.js";

type PluginOptions = Record<string, any>;


const setupSyncNode = async (dataDirectory: string): Promise<Contracts.Kernel.Application> => {
	const app = new Application();

	await setupNode(app, dataDirectory, "../paths/config", "sync-node");

	const consensus = app.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service);
	void consensus.run();

	return app;
};

const setupLegacySyncNode = async (dataDirectory: string): Promise<Contracts.Kernel.Application> => {
	const app = new Application();

	await setupNode(app, dataDirectory, "../paths/config-snapshot", "sync-node-legacy");

	const consensus = app.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service);
	void consensus.run();

	return app;
};

const setupRestoreNode = async (dataDirectory: string): Promise<Contracts.Kernel.Application> => {
	const app = new Application();

	await setupNode(app, dataDirectory, "../paths/config", "restore-node");

	return app;
}

const setupLegacyRestoreNode = async (dataDirectory: string): Promise<Contracts.Kernel.Application> => {
	const app = new Application();

	await setupNode(app, dataDirectory, "../paths/config-snapshot", "restore-node-legacy");

	return app;
}

const setupNode = async (app: Application, dataDirectory: string, configDirectory: string, name: string): Promise<void> => {
	app.bind(Identifiers.Application.Name).toConstantValue(name);
	app.bind(Identifiers.Application.Version).toConstantValue("1.0");
	app.bind(Identifiers.Config.Flags).toConstantValue({});
	app.bind(Identifiers.Config.Plugins).toConstantValue({});
	app
		.bind(Identifiers.Services.EventDispatcher.Service)
		.to(Services.Events.MemoryEventDispatcher)
		.inSingletonScope();

	app.bind(Identifiers.ConsensusStorage.Service).toConstantValue(<Contracts.ConsensusStorage.Service>{
		getMessages: async () => [],
		getProposals: async () => [],
		getState: async () => { },
		persist: async () => { },
	});

	app.bind(Identifiers.P2P.Broadcaster).toConstantValue({
		broadcastMessage: async () => { },
		broadcastProposal: async () => { },
	});
	app.bind(Identifiers.P2P.Statistic.Service).toConstantValue({ newRound: () => { } });

	app.bind(Identifiers.TransactionPool.Broadcaster).toConstantValue({
		broadcastTransactions: async () => { },
	});
	app.bind(Identifiers.TransactionPool.Worker).to(PoolWorker).inSingletonScope();
	app.bind(Identifiers.Evm.Worker).toConstantValue({
		onCommit: async () => { },
	});

	app.bind(Identifiers.CryptoWorker.Worker.Instance).to(Worker).inSingletonScope();
	app
		.bind(Identifiers.CryptoWorker.WorkerPool)
		.toConstantValue({ getWorker: () => app.get<Worker>(Identifiers.CryptoWorker.Worker.Instance) });

	await app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.RegisterBaseServiceProviders).bootstrap();
	await app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.RegisterBaseConfiguration).bootstrap();

	// RegisterBaseBindings
	app.bind("path.data").toConstantValue(dataDirectory);
	app.bind("path.config").toConstantValue(resolve(import.meta.dirname, configDirectory));
	app.bind("path.cache").toConstantValue("");
	app.bind("path.log").toConstantValue("");
	app.bind("path.temp").toConstantValue("");

	await app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.LoadEnvironmentVariables).bootstrap();
	await app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.LoadConfiguration).bootstrap();

	await ensureDatabaseExists(name);

	const options = {
		"@mainsail/state": {
			snapshots: {
				enabled: false,
			},
		},
		"@mainsail/transaction-pool-service": {
			// bech32m addresses require more bytes than the default which assumes base58.
			maxTransactionBytes: 50_000,

			storage: ":memory:",
		},
		"@mainsail/api-database": {
			database: {
				applicationName: `mainsail/${name}`,
				database: name,
			}
		},
		"@mainsail/api-sync": {
			maxSyncAttempts: 1,
			syncInterval: 250,
			truncateDatabase: "1",
		},
	};

	const packages = [
		"@mainsail/validation",
		"@mainsail/crypto-config",
		"@mainsail/crypto-validation",
		"@mainsail/crypto-hash-bcrypto",
		"@mainsail/crypto-signature-ecdsa",
		"@mainsail/crypto-key-pair-ecdsa",
		"@mainsail/crypto-signature-bls12-381",
		"@mainsail/crypto-key-pair-bls12-381",
		"@mainsail/crypto-address-base58",
		"@mainsail/crypto-address-keccak256",
		"@mainsail/crypto-wif",
		"@mainsail/serializer",
		"@mainsail/crypto-block",
		"@mainsail/evm-service",
		"@mainsail/database",
		"@mainsail/api-database",
		"@mainsail/api-sync",
		"@mainsail/blockchain-utils",
		"@mainsail/crypto-transaction",
		"@mainsail/snapshot-legacy-importer",
		"@mainsail/state",
		"@mainsail/transactions",
		"@mainsail/transaction-pool-service",
		"@mainsail/crypto-proposal",
		"@mainsail/crypto-messages",
		"@mainsail/crypto-commit",
		"@mainsail/processor",
		"@mainsail/evm-consensus",
		"@mainsail/forger",
		"@mainsail/validator",
		"@mainsail/consensus",
	];

	for (const packageId of packages) {
		await loadPlugin(app, packageId, options);
	}

	for (const packageId of packages) {
		await bootPlugin(app, packageId);
	}

	await bootstrap(app);
}

const loadPlugin = async (app: Application, packageId: string, options: PluginOptions) => {
	const serviceProviderRepository = app.get<Providers.ServiceProviderRepository>(
		Identifiers.ServiceProvider.Repository,
	);

	const { ServiceProvider } = await import(packageId);
	const pluginConfiguration = await getPluginConfiguration(app, packageId, options);

	const manifest = app.resolve(Providers.PluginManifest).discover(packageId, import.meta.url);

	const serviceProvider = app.resolve<Providers.ServiceProvider>(ServiceProvider);
	serviceProvider.setManifest(manifest);
	if (pluginConfiguration) {
		serviceProvider.setConfig(pluginConfiguration);
	}

	serviceProviderRepository.set(packageId, serviceProvider);
	await serviceProviderRepository.register(packageId);
};

const bootPlugin = async (app: Application, packageId: string) => {
	const serviceProviderRepository = app.get<Providers.ServiceProviderRepository>(
		Identifiers.ServiceProvider.Repository,
	);

	await serviceProviderRepository.boot(packageId);
};

const getPluginConfiguration = async (
	app: Application,
	packageId: string,
	options: PluginOptions,
): Promise<Providers.PluginConfiguration | undefined> => {
	let defaults = {};
	try {
		({ defaults } = await import(`${packageId}/distribution/defaults.js`));
	} catch { }

	return app
		.resolve(Providers.PluginConfiguration)
		.from(packageId, defaults)
		.merge(options[packageId] || {});
};


const bootstrap = async (app: Contracts.Kernel.Application): Promise<void> => {
	process.env[EnvironmentVariables.MAINSAIL_API_SYNC_LOG_EXTRA] = "true";

	const configuration = app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
	const commitFactory = app.get<Contracts.Crypto.CommitFactory>(Identifiers.Cryptography.Commit.Factory);

	const genesisCommitJson = configuration.getGenesisCommit();
	const genesisCommit = await commitFactory.fromJson(genesisCommitJson);

	const stateStore = app.get<Contracts.State.Store>(Identifiers.State.Store);
	stateStore.setGenesisCommit(genesisCommit);

	const databaseService = app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service);
	if (await databaseService.isEmpty()) {
		const commitState = app.get<Contracts.Consensus.CommitStateFactory>(
			Identifiers.Consensus.CommitState.Factory,
		)(genesisCommit);

		const blockProcessor = app.get<Contracts.Processor.BlockProcessor>(Identifiers.Processor.BlockProcessor);

		await tryImportSnapshot(app, genesisCommit);

		const result = await blockProcessor.process(commitState);
		if (!result.success) {
			throw new Error("Failed to process genesis block");
		}

		commitState.setProcessorResult(result);
		await blockProcessor.commit(commitState);
	} else {
		// restore node path
		const commit = await databaseService.getLastCommit();
		stateStore.setLastBlock(commit.block);
		stateStore.setTotalRound(databaseService.getState().totalRound);
	}

	const validatorSet = app.get<Contracts.ValidatorSet.Service>(Identifiers.ValidatorSet.Service);
	await validatorSet.restore();

	await app.get<Contracts.ApiSync.Service>(Identifiers.ApiSync.Service).bootstrap();

	app.get<Contracts.State.State>(Identifiers.State.State).setBootstrap(false);
};

const tryImportSnapshot = async (app: Contracts.Kernel.Application, genesisCommit: Contracts.Crypto.Commit): Promise<void> => {
	const configuration = app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
	const milestone = configuration.getMilestone();

	// assume snapshot is present if the previous block points to a non-zero hash
	if (genesisCommit.block.parentHash === "0000000000000000000000000000000000000000000000000000000000000000") {
		if (milestone.snapshot) {
			throw new Error("Previous block is set to snapshot, but there is no snapshot defined in milestones");
		}

		return;
	}

	const snapshotImporter = app.get<Contracts.Snapshot.LegacyImporter>(Identifiers.Snapshot.Legacy.Importer);
	await snapshotImporter.run(genesisCommit);
}

const ensureDatabaseExists = async (database: string): Promise<void> => {
	// run from default postgres database
	await runDatabaseQuery("test_db", async (dataSource: TypeOrm.DataSource): Promise<void> => {
		const result = await dataSource.query(
			`SELECT 1 FROM pg_database WHERE datname = $1`,
			[database]
		);

		if (result.length === 0) {
			await dataSource.query(`CREATE DATABASE "${database}"`);
		}
	});
}

const runDatabaseQuery = async <T>(databaseName: string, callback: (dataSource: TypeOrm.DataSource) => Promise<T>): Promise<T> => {
	const nodeDatabase = new TypeOrm.DataSource({
		database: databaseName,
		host: process.env.MAINSAIL_DB_HOST || "127.0.0.1",
		password: "password",
		port: 5432,
		type: "postgres",
		username: "test_db",
	});

	if (!nodeDatabase.isInitialized) {
		await nodeDatabase.initialize();
	}

	try {
		const result = await callback(nodeDatabase);
		return result;
	} catch (ex) {
		console.log("runDatabaseQuery", ex.message);
		throw ex;
	} finally {
		await nodeDatabase.destroy();
	}
}

const shutdown = async (app: Contracts.Kernel.Application): Promise<void> => {
	const serviceProviders: Providers.ServiceProvider[] = app
		.get<Providers.ServiceProviderRepository>(Identifiers.ServiceProvider.Repository)
		.allLoadedProviders();

	for (const serviceProvider of serviceProviders.reverse()) {
		try {
			await serviceProvider.dispose();
		} catch {
			/* */
		}
	}
};

export { bootstrap, runDatabaseQuery, setupLegacyRestoreNode, setupLegacySyncNode, setupRestoreNode, setupSyncNode, shutdown };
