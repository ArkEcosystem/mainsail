import { Contracts, Identifiers } from "@mainsail/contracts";
import { Bootstrap, Providers, Services } from "@mainsail/kernel";
import { Sandbox } from "@mainsail/test-framework";
import { join } from "path";

import { ValidatorsJson } from "./contracts.js";
import { MemoryDatabase } from "./database.js";
import { TestLogger } from "./logger.js";
import { P2PRegistry } from "./p2p.js";
import { Selector } from "./selector.js";
import { Worker } from "./worker.js";

type PluginOptions = Record<string, any>;

const setup = async (id: number, p2pRegistry: P2PRegistry, crypto: any, validators: ValidatorsJson) => {
	const sandbox = new Sandbox();

	// Basic binds and mocks
	sandbox.app.bind(Identifiers.Application.Name).toConstantValue("mainsail");
	sandbox.app.bind(Identifiers.Config.Flags).toConstantValue({});
	sandbox.app.bind(Identifiers.Config.Plugins).toConstantValue({});
	sandbox.app
		.bind(Identifiers.Services.EventDispatcher.Service)
		.to(Services.Events.MemoryEventDispatcher)
		.inSingletonScope();

	p2pRegistry.registerNode(id, sandbox.app);
	sandbox.app.bind(Identifiers.P2P.Broadcaster).toConstantValue(p2pRegistry.makeBroadcaster(id));

	sandbox.app.bind(Identifiers.ConsensusStorage.Service).toConstantValue(<Contracts.ConsensusStorage.Service>{
		clear: async () => {},
		getPrecommits: async () => [],
		getPrevotes: async () => [],
		getProposals: async () => [],
		getState: async () => {},
		savePrecommits: async () => {},
		savePrevotes: async () => {},
		saveProposals: async () => {},
		saveState: async () => {},
	});

	sandbox.app.bind(Identifiers.Proposer.Selector).to(Selector).inSingletonScope();

	sandbox.app.bind(Identifiers.Database.Service).to(MemoryDatabase).inSingletonScope();

	sandbox.app.bind(Identifiers.CryptoWorker.Worker.Instance).to(Worker).inSingletonScope();
	sandbox.app
		.bind(Identifiers.CryptoWorker.WorkerPool)
		.toConstantValue({ getWorker: () => sandbox.app.get<Worker>(Identifiers.CryptoWorker.Worker.Instance) });

	// Bootstrap
	await sandbox.app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.RegisterBaseServiceProviders).bootstrap();
	await sandbox.app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.RegisterBaseConfiguration).bootstrap();

	// RegisterBaseBindings
	sandbox.app.bind("path.data").toConstantValue("");
	sandbox.app.bind("path.config").toConstantValue(join(import.meta.dirname, `../config`));
	sandbox.app.bind("path.cache").toConstantValue("");
	sandbox.app.bind("path.log").toConstantValue("");
	sandbox.app.bind("path.temp").toConstantValue("");

	await sandbox.app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.LoadEnvironmentVariables).bootstrap();

	// Load configuration
	const configRepository = sandbox.app.get<Services.Config.ConfigRepository>(Identifiers.Config.Repository);
	configRepository.set("validators", validators);
	configRepository.set("crypto", crypto);

	// Set logger
	const logManager: Services.Log.LogManager = sandbox.app.get<Services.Log.LogManager>(
		Identifiers.Services.Log.Manager,
	);
	await logManager.extend("test", async () => sandbox.app.resolve<TestLogger>(TestLogger).make({ id }));
	logManager.setDefaultDriver("test");

	// Load packages
	const packages = [
		"@mainsail/validation",
		"@mainsail/crypto-config",
		"@mainsail/crypto-validation",
		"@mainsail/crypto-hash-bcrypto",
		"@mainsail/crypto-signature-schnorr",
		"@mainsail/crypto-key-pair-schnorr",
		"@mainsail/crypto-consensus-bls12-381",
		"@mainsail/crypto-address-bech32m",
		"@mainsail/crypto-wif",
		"@mainsail/serializer",
		"@mainsail/crypto-block",
		"@mainsail/fees",
		"@mainsail/fees-static",
		"@mainsail/evm",
		"@mainsail/crypto-transaction",
		"@mainsail/crypto-transaction-username-registration",
		"@mainsail/crypto-transaction-username-resignation",
		"@mainsail/crypto-transaction-validator-registration",
		"@mainsail/crypto-transaction-validator-resignation",
		"@mainsail/crypto-transaction-multi-payment",
		"@mainsail/crypto-transaction-multi-signature-registration",
		"@mainsail/crypto-transaction-transfer",
		"@mainsail/crypto-transaction-vote",
		"@mainsail/state",
		"@mainsail/transactions",
		"@mainsail/transaction-pool",
		"@mainsail/crypto-messages",
		"@mainsail/crypto-commit",
		"@mainsail/processor",
		"@mainsail/validator-set-static",
		"@mainsail/validator",
		"@mainsail/consensus",
	];

	const options = {
		"@mainsail/transaction-pool": {
			storage: ":memory:",
		},
	};

	for (const packageId of packages) {
		await loadPlugin(sandbox, packageId, options);
	}

	return sandbox;
};

const loadPlugin = async (sandbox: Sandbox, packageId: string, options: PluginOptions) => {
	const serviceProviderRepository = sandbox.app.get<Providers.ServiceProviderRepository>(
		Identifiers.ServiceProvider.Repository,
	);

	const { ServiceProvider } = await import(packageId);
	const pluginConfiguration = await getPluginConfiguration(sandbox, packageId, options);

	const manifest = sandbox.app.resolve(Providers.PluginManifest).discover(packageId, import.meta.url);

	const serviceProvider = sandbox.app.resolve<Providers.ServiceProvider>(ServiceProvider);
	serviceProvider.setManifest(manifest);
	if (pluginConfiguration) {
		serviceProvider.setConfig(pluginConfiguration);
	}

	serviceProviderRepository.set(packageId, serviceProvider);
	await serviceProviderRepository.register(packageId);
};

const getPluginConfiguration = async (
	sandbox: Sandbox,
	packageId: string,
	options: PluginOptions,
): Promise<Providers.PluginConfiguration | undefined> => {
	try {
		const { defaults } = await import(`${packageId}/distribution/defaults.js`);

		return sandbox.app
			.resolve(Providers.PluginConfiguration)
			.from(packageId, defaults)
			.merge(options[packageId] || {});
	} catch {}
	return undefined;
};

const boot = async (sandbox: Sandbox) => {
	const serviceProviderRepository = sandbox.app.get<Providers.ServiceProviderRepository>(
		Identifiers.ServiceProvider.Repository,
	);

	for (const [name] of serviceProviderRepository.all()) {
		await serviceProviderRepository.boot(name);
	}
};

const bootMany = async (sandboxes: Sandbox[]) => {
	for (const sandbox of sandboxes) {
		await boot(sandbox);
	}
};

const bootstrap = async (sandbox: Sandbox) => {
	const configuration = sandbox.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
	const commitFactory = sandbox.app.get<Contracts.Crypto.CommitFactory>(Identifiers.Cryptography.Commit.Factory);
	const genesisCommitJson = configuration.get("genesisBlock");

	const genesisCommit = await commitFactory.fromJson(genesisCommitJson);

	const stateService = sandbox.app.get<Contracts.State.Service>(Identifiers.State.Service);
	const store = stateService.getStore();

	store.setGenesisCommit(genesisCommit);
	store.setLastBlock(genesisCommit.block);

	const validatorSet = sandbox.app.get<Contracts.ValidatorSet.Service>(Identifiers.ValidatorSet.Service);
	validatorSet.restore(store);

	const commitState = sandbox.app.get<Contracts.Consensus.CommitStateFactory>(
		Identifiers.Consensus.CommitState.Factory,
	)(genesisCommit);

	const blockProcessor = sandbox.app.get<Contracts.Processor.BlockProcessor>(Identifiers.Processor.BlockProcessor);

	const result = await blockProcessor.process(commitState);
	if (!result) {
		throw new Error("Failed to process genesis block");
	}
	await blockProcessor.commit(commitState);

	sandbox.app.get<Contracts.State.State>(Identifiers.State.State).setBootstrap(false);
};

const bootstrapMany = async (sandboxes: Sandbox[]) => {
	for (const sandbox of sandboxes) {
		await bootstrap(sandbox);
	}
};

const run = async (sandbox: Sandbox) => {
	const consensus = sandbox.app.get<Contracts.Consensus.ConsensusService>(Identifiers.Consensus.Service);
	await consensus.run();
};

const runMany = async (sandboxes: Sandbox[]) => {
	for (const sandbox of sandboxes) {
		await run(sandbox);
	}
};

const stop = async (sandbox: Sandbox) => {
	const consensus = sandbox.app.get<Contracts.Consensus.ConsensusService>(Identifiers.Consensus.Service);
	await consensus.dispose();
};

const stopMany = async (sandboxes: Sandbox[]) => {
	for (const sandbox of sandboxes) {
		await stop(sandbox);
	}
};

export { boot, bootMany, bootstrap, bootstrapMany, run, runMany, setup, stop, stopMany };
