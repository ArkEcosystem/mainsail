import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { Application, Bootstrap, Providers, Services } from "@mainsail/kernel";
import { resolve } from "path";
import { dirSync } from "tmp";

import { PoolWorker } from "./pool-worker.js";
import { getLegacyColdWallets } from "./utilities.js";
import { Worker } from "./worker.js";

type PluginOptions = Record<string, any>;

const setup = async (): Promise<Contracts.Kernel.Application> => {
	const app = new Application();

	app.bind(Identifiers.Application.Name).toConstantValue("mainsail");
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
	app.bind("path.data").toConstantValue(dirSync({ unsafeCleanup: true }).name);
	//app.bind("path.data").toConstantValue(resolve(import.meta.dirname, "../paths/data"));
	app.bind("path.config").toConstantValue(resolve(import.meta.dirname, "../paths/config"));
	app.bind("path.cache").toConstantValue("");
	app.bind("path.log").toConstantValue("");
	app.bind("path.temp").toConstantValue("");

	await app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.LoadEnvironmentVariables).bootstrap();
	await app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.LoadConfiguration).bootstrap();

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
		"@mainsail/api-sync": {
			syncInterval: 250,
			maxSyncAttempts: 1,
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
		"@mainsail/crypto-consensus-bls12-381",
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
		"@mainsail/state",
		"@mainsail/transactions",
		"@mainsail/transaction-pool-service",
		"@mainsail/crypto-proposal",
		"@mainsail/crypto-messages",
		"@mainsail/crypto-commit",
		"@mainsail/processor",
		"@mainsail/evm-consensus",
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

	return app;
};

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

const bootstrap = async (app: Application) => {
	const configuration = app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
	const commitFactory = app.get<Contracts.Crypto.CommitFactory>(Identifiers.Cryptography.Commit.Factory);

	const genesisCommitJson = configuration.get<Contracts.Crypto.CommitJson>("genesisBlock");
	const genesisCommit = await commitFactory.fromJson(genesisCommitJson);

	const store = app.get<Contracts.State.Store>(Identifiers.State.Store);
	store.setGenesisCommit(genesisCommit);

	const commitState = app.get<Contracts.Consensus.CommitStateFactory>(
		Identifiers.Consensus.CommitState.Factory,
	)(genesisCommit);

	const blockProcessor = app.get<Contracts.Processor.BlockProcessor>(Identifiers.Processor.BlockProcessor);

	const evm = app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");

	await evm.prepareNextCommit({
		commitKey: {
			blockNumber: BigInt(commitState.blockNumber),
			round: BigInt(commitState.round),
			blockHash: commitState.getBlock().header.hash,
		},
	});

	// Import some legacy cold wallets
	const legacyColdWallets = await getLegacyColdWallets(app);
	await evm.importLegacyColdWallets(legacyColdWallets.map(({ legacyColdWallet }) => legacyColdWallet));
	//

	const result = await blockProcessor.process(commitState);
	if (!result) {
		throw new Error("Failed to process genesis block");
	}

	await blockProcessor.commit(commitState);

	const validatorSet = app.get<Contracts.ValidatorSet.Service>(Identifiers.ValidatorSet.Service);
	await validatorSet.restore();

	await app.get<Contracts.ApiSync.Service>(Identifiers.ApiSync.Service).bootstrap();

	app.get<Contracts.State.State>(Identifiers.State.State).setBootstrap(false);

	const consensus = app.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service);
	void consensus.run();
};

const shutdown = async (app: Contracts.Kernel.Application) => {
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

export { setup, shutdown };
