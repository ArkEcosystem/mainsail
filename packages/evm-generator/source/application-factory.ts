import type { Contracts } from "@mainsail/contracts";
import type { Providers } from "@mainsail/kernel";

import { Identifiers } from "@mainsail/constants";
import { Application, Bootstrap, Services } from "@mainsail/kernel";
import { existsSync, rmSync } from "fs";
import { resolve } from "path";

import { Generator } from "./generator.js";
import { Identifiers as InternalIdentifiers } from "./identifiers.js";

export const makeApplication = async (
	configurationPath: string,
	options: Record<string, unknown> = {},
): Promise<Application> => {
	const app = new Application();

	app.bind(Identifiers.Application.Name).toConstantValue("mainsail-evm-generator");
	app.bind(Identifiers.Application.Version).toConstantValue("1.0");
	app.bind(Identifiers.Config.Flags).toConstantValue({});
	app.bind(Identifiers.Config.Plugins).toConstantValue({});
	app.bind(Identifiers.Application.Thread).toConstantValue("");
	app.bind(Identifiers.Services.EventDispatcher.Service).to(Services.Events.MemoryEventDispatcher).inSingletonScope();

	app.bind(InternalIdentifiers.Application).toConstantValue(app);

	// await app.resolve(Services.Log.ServiceProvider).register();

	// const logger = app.resolve(Logger);
	// logger.setConfig({
	// 	all: () => ({ levels: { console: "info" } }),
	// } as unknown as Contracts.Kernel.PluginConfiguration);
	// await logger.register();

	await app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.RegisterBaseServiceProviders).bootstrap();
	await app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.RegisterBaseConfiguration).bootstrap();

	for (const f of ["evm.mdb", "evm.mdb-lock"]) {
		const path = resolve(import.meta.dirname, `../paths/data/${f}`);
		if (existsSync(path)) {
			rmSync(path);
		}
	}

	//
	//app.bind("path.data").toConstantValue(dirSync({ unsafeCleanup: true }).name);
	app.bind("path.data").toConstantValue(resolve(import.meta.dirname, "../paths/data"));
	app.bind("path.config").toConstantValue(resolve(import.meta.dirname, "../paths/config"));
	app.bind("path.cache").toConstantValue("");
	app.bind("path.log").toConstantValue("");
	app.bind("path.temp").toConstantValue("");

	//
	await app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.LoadEnvironmentVariables).bootstrap();
	await app.resolve<Contracts.Kernel.Bootstrapper>(Bootstrap.LoadConfiguration).bootstrap();

	app.bind(Identifiers.TransactionPool.Worker).toConstantValue({
		onCommit: () => {},
		start: () => {},
	});

	app.bind(Identifiers.Evm.Worker).toConstantValue({
		onCommit: () => {},
		start: () => {},
	});

	app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue({
		getWorker: () => ({
			consensusSignature: (method, message, privateKey) =>
				app
					.getTagged(Identifiers.Cryptography.Signature.Instance, "type", "consensus")
					?.[method](message, privateKey),
			transactionFactory: (method, message, privateKey) =>
				app.get(Identifiers.Cryptography.Transaction.Factory)?.[method](message, privateKey),
		}),
	});

	const packages = [
		"@mainsail/blockchain-utils",
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
		"@mainsail/serializer",
		"@mainsail/state",
		"@mainsail/processor",
		"@mainsail/crypto-block",
		"@mainsail/crypto-commit",
		"@mainsail/crypto-proposal",
		"@mainsail/crypto-transaction",
		"@mainsail/crypto-messages",
		"@mainsail/consensus",
		"@mainsail/evm-consensus",
		"@mainsail/evm-service",
		"@mainsail/database",
		"@mainsail/transactions",
		"@mainsail/validator",
	];

	for (const packageId of packages) {
		const { ServiceProvider } = await import(packageId);
		const serviceProvider: Providers.ServiceProvider = app.resolve(ServiceProvider);
		await serviceProvider.register();
	}

	app.bind(InternalIdentifiers.Generator).to(Generator);

	return app;
};
