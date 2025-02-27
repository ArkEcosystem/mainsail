import { Container } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressBase58 } from "@mainsail/crypto-address-base58";
import { ServiceProvider as CoreCryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CoreCryptoBlock } from "@mainsail/crypto-block";
import { ServiceProvider as CryptoCommit } from "@mainsail/crypto-commit";
import { ServiceProvider as CoreCryptoConfig } from "@mainsail/crypto-config";
import { ServiceProvider as CoreCryptoConsensus } from "@mainsail/crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairEcdsa } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as CryptoMessages } from "@mainsail/crypto-messages";
import { ServiceProvider as CoreCryptoSignatureEcdsa } from "@mainsail/crypto-signature-ecdsa";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { ServiceProvider as CoreCryptoTransactionEvmCall } from "@mainsail/crypto-transaction-evm-call";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/crypto-wif";
import { ServiceProvider as CoreEvmConsensus } from "@mainsail/evm-consensus";
import { ServiceProvider as EvmService } from "@mainsail/evm-service";
import { Application } from "@mainsail/kernel";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";
import { ServiceProvider as CoreSnapshotLegacyImporter } from "@mainsail/snapshot-legacy-importer";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";
import { dirSync, setGracefulCleanup } from "tmp";

import { ConfigurationGenerator } from "./configuration-generator.js";
import { ConfigurationWriter } from "./configuration-writer.js";
import {
	AppGenerator,
	EnvironmentGenerator,
	GenesisBlockGenerator,
	MilestonesGenerator,
	MnemonicGenerator,
	NetworkGenerator,
	PeersGenerator,
	WalletGenerator,
} from "./generators/index.js";
import { Identifiers as InternalIdentifiers } from "./identifiers.js";

export const makeApplication = async (configurationPath: string, options: Record<string, any> = {}) => {
	options = { address: "keccak256", name: "mainsail", ...options };

	const app = new Application(new Container());
	app.bind(Identifiers.Application.Name).toConstantValue(options.name);
	app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({
		dispatch: () => {},
	});
	app.bind(Identifiers.Services.Log.Service).toConstantValue({
		debug: (message: string) => console.log(message),
		info: (message: string) => console.log(message),
		warning: (message: string) => console.log(message),
	});
	// Used for evm instance
	const fsExtra = await import("fs-extra/esm");
	app.bind(Identifiers.Services.Filesystem.Service).toConstantValue({
		existsSync: () => true,
		readJSONSync: (file: string, options?: Record<string, any>) => fsExtra.readJSONSync(file, options),
	});
	setGracefulCleanup();
	app.rebind("path.data").toConstantValue(dirSync().name);

	await app.resolve(CoreSerializer).register();
	await app.resolve(CoreValidation).register();
	await app.resolve(CoreCryptoConfig).register();
	await app.resolve(CoreCryptoValidation).register();
	await app.resolve(CoreCryptoHashBcrypto).register();
	await app.resolve(CoreCryptoSignatureEcdsa).register();
	await app.resolve(CoreCryptoKeyPairEcdsa).register();
	await app.resolve(CoreCryptoAddressBase58).register();
	await app.resolve(CoreCryptoAddressKeccak256).register();
	await app.resolve(CryptoMessages).register();
	await app.resolve(CryptoCommit).register();
	await app.resolve(CoreCryptoConsensus).register();
	await app.resolve(CoreCryptoWif).register();
	await app.resolve(CoreCryptoBlock).register();
	await app.resolve(CoreEvmConsensus).register();
	await app.resolve(CoreCryptoTransaction).register();
	await app.resolve(CoreCryptoTransactionEvmCall).register();
	await app.resolve(CoreSnapshotLegacyImporter).register();
	await app.resolve(EvmService).register();

	// @ts-ignore
	app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setConfig({
		milestones: [
			{
				evmSpec: Contracts.Evm.SpecId.SHANGHAI,
				height: 0,
				timeouts: {
					blockPrepareTime: 4000,
					blockTime: 8000,
					stageTimeout: 2000,
					stageTimeoutIncrease: 2000,
					tolerance: 100,
				},
			},
		],
	});

	app.bind(InternalIdentifiers.Application).toConstantValue(app);
	app.bind(InternalIdentifiers.ConfigurationGenerator).to(ConfigurationGenerator);

	app.bind(InternalIdentifiers.ConfigurationPath).toConstantValue(configurationPath);
	app.bind(InternalIdentifiers.ConfigurationWriter).to(ConfigurationWriter);

	app.bind(InternalIdentifiers.Generator.App).to(AppGenerator);
	app.bind(InternalIdentifiers.Generator.Environment).to(EnvironmentGenerator);
	app.bind(InternalIdentifiers.Generator.GenesisBlock).to(GenesisBlockGenerator);
	app.bind(InternalIdentifiers.Generator.Milestones).to(MilestonesGenerator);
	app.bind(InternalIdentifiers.Generator.Mnemonic).to(MnemonicGenerator);
	app.bind(InternalIdentifiers.Generator.Network).to(NetworkGenerator);
	app.bind(InternalIdentifiers.Generator.Wallet).to(WalletGenerator);
	app.bind(InternalIdentifiers.Generator.Peers).to(PeersGenerator);

	app.unbind(Identifiers.Cryptography.Legacy.Identity.AddressFactory);

	return app;
};
