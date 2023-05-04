import { Container } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressBech32m } from "@mainsail/crypto-address-bech32m";
import { ServiceProvider as CoreCryptoBlock } from "@mainsail/crypto-block";
import { ServiceProvider as CoreCryptoConfig } from "@mainsail/crypto-config";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "@mainsail/crypto-key-pair-schnorr";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "@mainsail/crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTime } from "@mainsail/crypto-time";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { ServiceProvider as CoreCryptoTransactionTransfer } from "@mainsail/crypto-transaction-transfer";
import { ServiceProvider as CoreCryptoTransactionValidatorRegistration } from "@mainsail/crypto-transaction-validator-registration";
import { ServiceProvider as CoreCryptoTransactionVote } from "@mainsail/crypto-transaction-vote";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/core-crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/core-crypto-wif";
import { ServiceProvider as CoreFees } from "@mainsail/core-fees";
import { ServiceProvider as CoreFeesStatic } from "@mainsail/core-fees-static";
import { Application } from "@mainsail/core-kernel";
import { ServiceProvider as CoreSerializer } from "@mainsail/core-serializer";
import { ServiceProvider as CoreValidation } from "@mainsail/core-validation";

import { ConfigurationGenerator } from "./configuration-generator";
import { ConfigurationWriter } from "./configuration-writer";
import {
	AppGenerator,
	EnvironmentGenerator,
	GenesisBlockGenerator,
	MilestonesGenerator,
	MnemonicGenerator,
	NetworkGenerator,
	PeersGenerator,
	WalletGenerator,
} from "./generators";
import { Identifiers as InternalIdentifiers } from "./identifiers";

export const makeApplication = async (configurationPath?: string) => {
	const app = new Application(new Container());

	await app.resolve(CoreSerializer).register();
	await app.resolve(CoreValidation).register();
	await app.resolve(CoreCryptoConfig).register();
	await app.resolve(CoreCryptoTime).register();
	await app.resolve(CoreCryptoValidation).register();
	await app.resolve(CoreCryptoHashBcrypto).register();
	await app.resolve(CoreCryptoSignatureSchnorr).register();
	await app.resolve(CoreCryptoKeyPairSchnorr).register();
	await app.resolve(CoreCryptoAddressBech32m).register();
	await app.resolve(CoreCryptoWif).register();
	await app.resolve(CoreCryptoBlock).register();
	await app.resolve(CoreFees).register();
	await app.resolve(CoreFeesStatic).register();
	await app.resolve(CoreCryptoTransaction).register();
	await app.resolve(CoreCryptoTransactionValidatorRegistration).register();
	await app.resolve(CoreCryptoTransactionTransfer).register();
	await app.resolve(CoreCryptoTransactionVote).register();

	// @ts-ignore
	app.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration).setConfig({
		milestones: [{ address: { bech32m: "ark" }, height: 0 }],
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

	return app;
};
