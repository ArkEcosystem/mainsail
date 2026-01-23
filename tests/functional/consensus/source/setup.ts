import { Identifiers } from "@mainsail/constants";
import { Container } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Application, Bootstrap, Providers, Services } from "@mainsail/kernel";
import { join } from "path";
import { dirSync } from "tmp";

import type { ValidatorsJson } from "./contracts.js";
import { TestLogger } from "./logger.js";
import type { P2PRegistry } from "./p2p.js";
import { ProposerCalculator } from "./proposer-calculator.js";
import { Worker } from "./worker.js";

type PluginOptions = Record<string, any>;

const setup = async (id: number, p2pRegistry: P2PRegistry, crypto: any, validators: ValidatorsJson): Promise<Contracts.Kernel.Application> => {
	const app = new Application(new Container());

	// Basic binds and mocks
	app.bind(Identifiers.Application.Name).toConstantValue("mainsail");
	app.bind(Identifiers.Config.Flags).toConstantValue({});
	app.bind(Identifiers.Config.Plugins).toConstantValue({});
	app
		.bind(Identifiers.Services.EventDispatcher.Service)
		.to(Services.Events.MemoryEventDispatcher)
		.inSingletonScope();

	p2pRegistry.registerNode(id, app);
	app.bind(Identifiers.P2P.Broadcaster).toConstantValue(p2pRegistry.makeBroadcaster(id));
	app.bind(Identifiers.P2P.Statistic.Service).toConstantValue({ newRound: () => { } });

	app.bind(Identifiers.ConsensusStorage.Service).toConstantValue(<Contracts.ConsensusStorage.Service>{
		getMessages: async () => [],
		getProposals: async () => [],
		getState: async () => { },
		persist: async () => { },
	});

	app.bind(Identifiers.TransactionPool.Worker).toConstantValue({
		getTransactionBytes: async () => [],
		onCommit: async () => { },
	});
	app.bind(Identifiers.Evm.Worker).toConstantValue({
		onCommit: async () => { },
	});

	app.bind(Identifiers.CryptoWorker.Worker.Instance).to(Worker).inSingletonScope();
	app
		.bind(Identifiers.CryptoWorker.WorkerPool)
		.toConstantValue({ getWorker: () => app.get<Worker>(Identifiers.CryptoWorker.Worker.Instance) });

	// Bootstrap
	await app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.RegisterBaseServiceProviders).bootstrap();
	await app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.RegisterBaseConfiguration).bootstrap();

	// RegisterBaseBindings
	app.bind("path.data").toConstantValue(dirSync({ unsafeCleanup: true }).name);
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
	const logManager: Services.Log.LogManager = app.get<Services.Log.LogManager>(
		Identifiers.Services.Log.Manager,
	);
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
		"@mainsail/crypto-consensus-bls12-381",
		"@mainsail/crypto-address-keccak256",
		"@mainsail/crypto-wif",
		"@mainsail/serializer",
		"@mainsail/crypto-block",
		"@mainsail/evm-service",
		"@mainsail/blockchain-utils",
		"@mainsail/crypto-transaction",
		"@mainsail/state",
		"@mainsail/database",
		"@mainsail/transactions",
		"@mainsail/crypto-proposal",
		"@mainsail/crypto-messages",
		"@mainsail/crypto-commit",
		"@mainsail/processor",
		"@mainsail/evm-consensus",
		"@mainsail/validator",
		"@mainsail/consensus",
	];

	const options = {
		"@mainsail/state": {
			snapshots: {
				enabled: false,
			},
		},
	};

	for (const packageId of packages) {
		await loadPlugin(app, packageId, options);
	}

	// Rebinds
	app.rebind(Identifiers.BlockchainUtils.ProposerCalculator).to(ProposerCalculator).inSingletonScope();

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
	} catch { }
	return undefined;
};

const boot = async (app: Contracts.Kernel.Application): Promise<void> => {
	const serviceProviderRepository = app.get<Providers.ServiceProviderRepository>(
		Identifiers.ServiceProvider.Repository,
	);

	for (const [name] of serviceProviderRepository.all()) {
		await serviceProviderRepository.boot(name);
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
	const genesisCommitJson = configuration.get<Contracts.Crypto.CommitJson>("genesisBlock");

	const genesisCommit = await commitFactory.fromJson(genesisCommitJson);
	const store = app.get<Contracts.State.Store>(Identifiers.State.Store);
	store.setGenesisCommit(genesisCommit);
	// store.setLastBlock(genesisCommit.block);

	// const validatorSet = app.get<Contracts.ValidatorSet.Service>(Identifiers.ValidatorSet.Service);
	// await validatorSet.restore();

	const commitState = app.get<Contracts.Consensus.CommitStateFactory>(
		Identifiers.Consensus.CommitState.Factory,
	)(genesisCommit);

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
	const consensus = app.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service);
	await consensus.run();
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

	for (const [name] of serviceProviderRepository.all()) {
		await serviceProviderRepository.dispose(name);
	}
};

const stopMany = async (apps: Contracts.Kernel.Application[]) => {
	for (const app of apps) {
		await stop(app);
	}
};

export { boot, bootMany, bootstrap, bootstrapMany, run, runMany, setup, stop, stopMany };
