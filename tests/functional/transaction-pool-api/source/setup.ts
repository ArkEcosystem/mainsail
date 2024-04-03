import { Contracts, Identifiers } from "@mainsail/contracts";
import { Bootstrap, Providers } from "@mainsail/kernel";
import { Sandbox } from "@mainsail/test-framework";
import { resolve } from "path";

import { MemoryDatabase } from "./database.js";
import { Worker } from "./worker.js";

type PluginOptions = Record<string, any>;

const setup = async () => {
	const sandbox = new Sandbox();

	sandbox.app.bind(Identifiers.Application.Name).toConstantValue("mainsail");
	sandbox.app.bind(Identifiers.Config.Flags).toConstantValue({});
	sandbox.app.bind(Identifiers.Config.Plugins).toConstantValue({});
	sandbox.app
		.bind(Identifiers.Services.EventDispatcher.Service)
		.toConstantValue({ dispatch: () => {}, listen: () => {} });

	// TODO:
	sandbox.app.bind(Identifiers.P2P.Broadcaster).toConstantValue({
		broadcastPrecommit: async () => {},
		broadcastPrevote: async () => {},
		broadcastProposal: async () => {},
		broadcastTransactions: async () => {},
	});

	sandbox.app.bind(Identifiers.Database.Service).to(MemoryDatabase).inSingletonScope();

	sandbox.app.bind(Identifiers.CryptoWorker.Worker.Instance).to(Worker).inSingletonScope();
	sandbox.app
		.bind(Identifiers.CryptoWorker.WorkerPool)
		.toConstantValue({ getWorker: () => sandbox.app.get<Worker>(Identifiers.CryptoWorker.Worker.Instance) });

	await sandbox.app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.RegisterBaseServiceProviders).bootstrap();
	await sandbox.app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.RegisterErrorHandler).bootstrap();
	await sandbox.app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.RegisterBaseConfiguration).bootstrap();

	// RegisterBaseBindings
	sandbox.app.bind("path.data").toConstantValue(resolve(import.meta.dirname, "../paths/data"));
	sandbox.app.bind("path.config").toConstantValue(resolve(import.meta.dirname, "../paths/config"));
	sandbox.app.bind("path.cache").toConstantValue("");
	sandbox.app.bind("path.log").toConstantValue("");
	sandbox.app.bind("path.temp").toConstantValue("");

	await sandbox.app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.LoadEnvironmentVariables).bootstrap();
	await sandbox.app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.LoadConfiguration).bootstrap();

	const options = {
		"@mainsail/transaction-pool": {
			// bech32m addresses require more bytes than the default which assumes base58.
			maxTransactionBytes: 50_000,

			storage: ":memory:",
		},
	};

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
		"@mainsail/proposer",
		"@mainsail/consensus-storage",
		"@mainsail/consensus",
	];

	for (const packageId of packages) {
		await loadPlugin(sandbox, packageId, options);
	}

	for (const packageId of packages) {
		await bootPlugin(sandbox, packageId);
	}

	await bootstrap(sandbox);

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

const bootPlugin = async (sandbox: Sandbox, packageId: string) => {
	const serviceProviderRepository = sandbox.app.get<Providers.ServiceProviderRepository>(
		Identifiers.ServiceProvider.Repository,
	);

	await serviceProviderRepository.boot(packageId);
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

	const consensus = sandbox.app.get<Contracts.Consensus.ConsensusService>(Identifiers.Consensus.Service);

	void consensus.run();
};

const shutdown = async (sandbox: Sandbox) => {
	const serviceProviders: Providers.ServiceProvider[] = sandbox.app
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
