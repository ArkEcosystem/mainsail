import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Application, Bootstrap, Providers, Services } from "@mainsail/kernel";
import { copyFileSync } from "fs";
import { join } from "path";
import { dirSync } from "tmp";

import type { ValidatorsJson } from "./contracts.js";
import type { P2PRegistry } from "./p2p.js";

import { TestLogger } from "./logger.js";
import { ProposerCalculator } from "./proposer-calculator.js";
import { Worker } from "./worker.js";

type PluginOptions = Record<string, any>;

type SetupOptions = {
	// Load the real consensus storage (LMDB under the data path) instead of the no-op stub. It persists the
	// consensus state on dispose, which is what lets `restart` bring a node back mid-round.
	consensusStorage?: boolean;
	// Reuse this data directory instead of a fresh temporary one.
	dataPath?: string;
};

const setup = async (
	id: number,
	p2pRegistry: P2PRegistry,
	crypto: any,
	validators: ValidatorsJson,
	options: SetupOptions = {},
): Promise<Contracts.Kernel.Application> => {
	const app = new Application();

	// Basic binds and mocks
	app.bind(Identifiers.Application.Name).toConstantValue("mainsail");
	app.bind(Identifiers.Config.Flags).toConstantValue({});
	app.bind(Identifiers.Config.Plugins).toConstantValue({});
	app.bind(Identifiers.Services.EventDispatcher.Service).to(Services.Events.MemoryEventDispatcher).inSingletonScope();

	p2pRegistry.registerNode(id, app);
	app.bind(Identifiers.P2P.Broadcaster).toConstantValue(p2pRegistry.makeBroadcaster(id));
	app.bind(Identifiers.P2P.Statistic.Service).toConstantValue({ newRound: () => {} });

	if (!options.consensusStorage) {
		app.bind(Identifiers.ConsensusStorage.Service).toConstantValue(<Contracts.ConsensusStorage.Service>{
			getMessages: async () => [],
			getProposals: async () => [],
			getState: async () => {},
			persist: async () => {},
		});
	}

	app.bind(Identifiers.TransactionPool.Worker).toConstantValue({
		getTransactions: async () => ({ remaining: 0, transactions: [] }),
		onCommit: async () => {},
	});
	app.bind(Identifiers.Evm.Worker).toConstantValue({
		onCommit: async () => {},
	});

	app.bind(Identifiers.CryptoWorker.Worker.Instance).to(Worker).inSingletonScope();
	app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue({
		getWorker: () => app.get<Worker>(Identifiers.CryptoWorker.Worker.Instance),
	});

	// Bootstrap
	await app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.RegisterBaseServiceProviders).bootstrap();
	await app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.RegisterBaseConfiguration).bootstrap();

	// RegisterBaseBindings
	app.bind("path.data").toConstantValue(options.dataPath ?? dirSync({ unsafeCleanup: true }).name);
	app.bind("path.config").toConstantValue(join(import.meta.dirname, `../config`));
	app.bind("path.cache").toConstantValue("");
	app.bind("path.log").toConstantValue("");
	app.bind("path.temp").toConstantValue("");

	await app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.LoadEnvironmentVariables).bootstrap();

	// Load configuration
	const configRepository = app.get<Services.Config.ConfigRepository>(Identifiers.Config.Repository);
	configRepository.set("validators", validators);
	configRepository.set("crypto", crypto);

	// Set logger
	const logManager: Services.Log.LogManager = app.get<Services.Log.LogManager>(Identifiers.Services.Log.Manager);
	await logManager.extend("test", async () => app.resolve<TestLogger>(TestLogger).make({ id }));
	logManager.setDefaultDriver("test");

	// Load packages
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
		"@mainsail/blockchain-utils",
		"@mainsail/crypto-transaction",
		"@mainsail/state",
		"@mainsail/database",
		"@mainsail/crypto-proposal",
		"@mainsail/crypto-messages",
		"@mainsail/crypto-commit",
		"@mainsail/processor",
		"@mainsail/evm-consensus",
		"@mainsail/forger",
		"@mainsail/validator",
		...(options.consensusStorage ? ["@mainsail/consensus-storage"] : []),
		"@mainsail/consensus",
	];

	const pluginOptions = {
		"@mainsail/state": {
			snapshots: {
				enabled: false,
			},
		},
	};

	for (const packageId of packages) {
		await loadPlugin(app, packageId, pluginOptions);
	}

	// Rebinds
	app.rebind(Identifiers.BlockchainUtils.ProposerCalculator).to(ProposerCalculator).inSingletonScope();
	app.rebind(Identifiers.Validator.DoubleSignGuard).toConstantValue({ guard: async () => {} });

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

const getPluginConfiguration = async (
	app: Application,
	packageId: string,
	options: PluginOptions,
): Promise<Providers.PluginConfiguration | undefined> => {
	try {
		const { defaults } = await import(`${packageId}/distribution/defaults.js`);

		return app
			.resolve(Providers.PluginConfiguration)
			.from(packageId, defaults)
			.merge(options[packageId] || {});
	} catch {}
	return undefined;
};

const boot = async (app: Contracts.Kernel.Application): Promise<void> => {
	const serviceProviderRepository = app.get<Providers.ServiceProviderRepository>(
		Identifiers.ServiceProvider.Repository,
	);

	for (const serviceProvider of serviceProviderRepository.all()) {
		await serviceProviderRepository.boot(serviceProvider.name());
	}
};

const bootMany = async (apps: Contracts.Kernel.Application[]): Promise<void> => {
	for (const app of apps) {
		await boot(app);
	}
};

const bootstrap = async (app: Contracts.Kernel.Application) => {
	const configuration = app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
	const commitFactory = app.get<Contracts.Crypto.CommitFactory>(Identifiers.Cryptography.Commit.Factory);
	const genesisCommitJson = configuration.getGenesisCommit();
	const genesisCommit = await commitFactory.fromJson(genesisCommitJson);
	const store = app.get<Contracts.State.Store>(Identifiers.State.Store);
	store.setGenesisCommit(genesisCommit);
	// store.setLastBlock(genesisCommit.block);

	// const validatorSet = app.get<Contracts.ValidatorSet.Service>(Identifiers.ValidatorSet.Service);
	// await validatorSet.restore();

	const commitState = app.get<Contracts.Consensus.CommitStateFactory>(Identifiers.Consensus.CommitState.Factory)(
		genesisCommit,
	);

	const blockProcessor = app.get<Contracts.Processor.BlockProcessor>(Identifiers.Processor.BlockProcessor);

	const result = await blockProcessor.process(commitState);
	if (!result.success) {
		throw new Error("Failed to process genesis block");
	}
	await blockProcessor.commit(commitState);

	app.get<Contracts.Validator.ValidatorRepository>(Identifiers.Validator.Repository).printLoadedValidators();

	app.get<Contracts.State.State>(Identifiers.State.State).setBootstrap(false);
};

const bootstrapMany = async (apps: Contracts.Kernel.Application[]) => {
	for (const app of apps) {
		await bootstrap(app);
	}
};

const run = async (app: Contracts.Kernel.Application) => {
	const bootstrapper = app.get<Contracts.Consensus.Bootstrapper>(Identifiers.Consensus.Bootstrapper);
	const consensus = app.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service);
	await consensus.run(await bootstrapper.bootstrap());
};

const runMany = async (apps: Contracts.Kernel.Application[]) => {
	for (const app of apps) {
		await run(app);
	}
};

const stop = async (app: Contracts.Kernel.Application) => {
	const serviceProviderRepository = app.get<Providers.ServiceProviderRepository>(
		Identifiers.ServiceProvider.Repository,
	);

	for (const serviceProvider of serviceProviderRepository.all()) {
		await serviceProviderRepository.dispose(serviceProvider.name());
	}
};

const stopMany = async (apps: Contracts.Kernel.Application[]) => {
	for (const app of apps) {
		await stop(app);
	}
};

const restart = async (
	app: Contracts.Kernel.Application,
	id: number,
	p2pRegistry: P2PRegistry,
	crypto: any,
	validators: ValidatorsJson,
): Promise<Contracts.Kernel.Application> => {
	await stop(app);
	p2pRegistry.unregisterNode(id);

	const dataPath = dirSync({ unsafeCleanup: true }).name;
	copyFileSync(join(app.dataPath(), "consensus.mdb"), join(dataPath, "consensus.mdb"));

	const restarted = await setup(id, p2pRegistry, crypto, validators, { consensusStorage: true, dataPath });
	await boot(restarted);
	await bootstrap(restarted);
	await run(restarted);

	return restarted;
};

export { boot, bootMany, bootstrap, bootstrapMany, restart, run, runMany, setup, stop, stopMany };
