import { Contracts, Identifiers } from "@mainsail/contracts";
import { Bootstrap, Providers } from "@mainsail/kernel";
import { Sandbox } from "@mainsail/test-framework";

const setup = async () => {
	const sandbox = new Sandbox();

	sandbox.app.bind(Identifiers.Application.Name).toConstantValue("mainsail");
	sandbox.app.bind(Identifiers.Config.Flags).toConstantValue({});
	sandbox.app.bind(Identifiers.Config.Plugins).toConstantValue({});
	sandbox.app
		.bind(Identifiers.Services.EventDispatcher.Service)
		.toConstantValue({ dispatch: () => {}, listen: () => {} });

	// TODO:
	sandbox.app.bind(Identifiers.Transaction.Handler.Instances).toConstantValue([]);
	sandbox.app.bind(Identifiers.P2P.Broadcaster).toConstantValue({});
	sandbox.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue({});

	await sandbox.app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.RegisterBaseServiceProviders).bootstrap();
	await sandbox.app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.RegisterErrorHandler).bootstrap();
	await sandbox.app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.RegisterBaseConfiguration).bootstrap();

	// RegisterBaseBindings
	sandbox.app.bind("path.data").toConstantValue("/home/ubuntu/mainsail/tests/functional/consensus/paths/data");
	sandbox.app.bind("path.config").toConstantValue("/home/ubuntu/mainsail/tests/functional/consensus/paths/config");
	sandbox.app.bind("path.cache").toConstantValue("");
	sandbox.app.bind("path.log").toConstantValue("");
	sandbox.app.bind("path.temp").toConstantValue("");

	await sandbox.app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.LoadEnvironmentVariables).bootstrap();
	await sandbox.app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.LoadConfiguration).bootstrap();

	await loadPlugin(sandbox, "@mainsail/validation");
	await loadPlugin(sandbox, "@mainsail/crypto-config");
	await loadPlugin(sandbox, "@mainsail/crypto-validation");
	await loadPlugin(sandbox, "@mainsail/crypto-hash-bcrypto");
	await loadPlugin(sandbox, "@mainsail/crypto-signature-schnorr");
	await loadPlugin(sandbox, "@mainsail/crypto-key-pair-schnorr");
	await loadPlugin(sandbox, "@mainsail/crypto-consensus-bls12-381");
	await loadPlugin(sandbox, "@mainsail/crypto-address-bech32m");
	await loadPlugin(sandbox, "@mainsail/crypto-wif");
	await loadPlugin(sandbox, "@mainsail/serializer");
	await loadPlugin(sandbox, "@mainsail/crypto-block");
	await loadPlugin(sandbox, "@mainsail/fees");
	await loadPlugin(sandbox, "@mainsail/fees-static");
	await loadPlugin(sandbox, "@mainsail/crypto-transaction");
	await loadPlugin(sandbox, "@mainsail/state");
	await loadPlugin(sandbox, "@mainsail/database");
	await loadPlugin(sandbox, "@mainsail/transactions");
	await loadPlugin(sandbox, "@mainsail/transaction-pool");
	await loadPlugin(sandbox, "@mainsail/crypto-messages");
	await loadPlugin(sandbox, "@mainsail/crypto-commit");
	await loadPlugin(sandbox, "@mainsail/processor");
	await loadPlugin(sandbox, "@mainsail/validator-set-static");
	await loadPlugin(sandbox, "@mainsail/validator");
	await loadPlugin(sandbox, "@mainsail/proposer");
	await loadPlugin(sandbox, "@mainsail/consensus");

	await bootPlugin(sandbox, "@mainsail/validation");
	await bootPlugin(sandbox, "@mainsail/crypto-config");
	await bootPlugin(sandbox, "@mainsail/crypto-validation");
	await bootPlugin(sandbox, "@mainsail/crypto-hash-bcrypto");
	await bootPlugin(sandbox, "@mainsail/crypto-signature-schnorr");
	await bootPlugin(sandbox, "@mainsail/crypto-key-pair-schnorr");
	await bootPlugin(sandbox, "@mainsail/crypto-consensus-bls12-381");
	await bootPlugin(sandbox, "@mainsail/crypto-address-bech32m");
	await bootPlugin(sandbox, "@mainsail/crypto-wif");
	await bootPlugin(sandbox, "@mainsail/serializer");
	await bootPlugin(sandbox, "@mainsail/crypto-block");
	await bootPlugin(sandbox, "@mainsail/fees");
	await bootPlugin(sandbox, "@mainsail/fees-static");
	await bootPlugin(sandbox, "@mainsail/crypto-transaction");
	await bootPlugin(sandbox, "@mainsail/state");
	await bootPlugin(sandbox, "@mainsail/database");
	await bootPlugin(sandbox, "@mainsail/transactions");
	await bootPlugin(sandbox, "@mainsail/transaction-pool");
	await bootPlugin(sandbox, "@mainsail/crypto-messages");
	await bootPlugin(sandbox, "@mainsail/crypto-commit");
	await bootPlugin(sandbox, "@mainsail/processor");
	await bootPlugin(sandbox, "@mainsail/validator-set-static");
	await bootPlugin(sandbox, "@mainsail/validator");
	await bootPlugin(sandbox, "@mainsail/proposer");
	await bootPlugin(sandbox, "@mainsail/consensus");

	return sandbox;
};

const loadPlugin = async (sandbox: Sandbox, packageId: string) => {
	const serviceProviderRepository = sandbox.app.get<Providers.ServiceProviderRepository>(
		Identifiers.ServiceProvider.Repository,
	);

	const { ServiceProvider } = await import(packageId);
	const pluginConfiguration = await getPluginConfiguration(sandbox, packageId);

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
): Promise<Providers.PluginConfiguration | undefined> => {
	try {
		const { defaults } = await import(`${packageId}/distribution/defaults.js`);

		return sandbox.app.resolve(Providers.PluginConfiguration).from(packageId, defaults);
	} catch {}
	return undefined;
};

export { setup };
