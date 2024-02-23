import { Container } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressBase58 } from "@mainsail/crypto-address-base58";
import { ServiceProvider as CoreCryptoAddressBech32m } from "@mainsail/crypto-address-bech32m";
import { ServiceProvider as CoreCryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CoreCryptoBlock } from "@mainsail/crypto-block";
import { ServiceProvider as CryptoCommit } from "@mainsail/crypto-commit";
import { ServiceProvider as CoreCryptoConfig } from "@mainsail/crypto-config";
import { ServiceProvider as CoreCryptoConsensus } from "@mainsail/crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairEcdsa } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as CryptoMessages } from "@mainsail/crypto-messages";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "@mainsail/crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { ServiceProvider as CoreCryptoTransactionTransfer } from "@mainsail/crypto-transaction-transfer";
import { ServiceProvider as CoreCryptoTransactionUsernameRegistration } from "@mainsail/crypto-transaction-username-registration";
import { ServiceProvider as CoreCryptoTransactionValidatorRegistration } from "@mainsail/crypto-transaction-validator-registration";
import { ServiceProvider as CoreCryptoTransactionVote } from "@mainsail/crypto-transaction-vote";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/crypto-wif";
import { ServiceProvider as CoreFees } from "@mainsail/fees";
import { ServiceProvider as CoreFeesStatic } from "@mainsail/fees-static";
import { Application } from "@mainsail/kernel";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";

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

export const makeApplication = async (configurationPath: string, options: Record<string, any> = {}) => {
	options = { address: "bech32m", bech32mPrefix: "ark", name: "mainsail", ...options };

	const app = new Application(new Container());
	app.bind(Identifiers.Application.Name).toConstantValue(options.name);

	await app.resolve(CoreSerializer).register();
	await app.resolve(CoreValidation).register();
	await app.resolve(CoreCryptoConfig).register();
	await app.resolve(CoreCryptoValidation).register();
	await app.resolve(CoreCryptoHashBcrypto).register();
	await app.resolve(CoreCryptoSignatureSchnorr).register();
	await app.resolve(CoreCryptoKeyPairEcdsa).register();

	let addressMilestone;

	switch (options.address) {
		case "base58": {
			await app.resolve(CoreCryptoAddressBase58).register();
			addressMilestone = { base58: options.base58Prefix };
			break;
		}
		case "bech32m": {
			await app.resolve(CoreCryptoAddressBech32m).register();
			addressMilestone = { bech32m: options.bech32mPrefix };
			break;
		}
		case "keccak256": {
			await app.resolve(CoreCryptoAddressKeccak256).register();
			addressMilestone = { keccak256: true };
			break;
		}		
		default: {
			throw new Exceptions.NotImplemented(options.addressFormat, "makeApplication");
		}
	}

	await app.resolve(CryptoMessages).register();
	await app.resolve(CryptoCommit).register();
	await app.resolve(CoreCryptoConsensus).register();
	await app.resolve(CoreCryptoWif).register();
	await app.resolve(CoreCryptoBlock).register();
	await app.resolve(CoreFees).register();
	await app.resolve(CoreFeesStatic).register();
	await app.resolve(CoreCryptoTransaction).register();
	await app.resolve(CoreCryptoTransactionValidatorRegistration).register();
	await app.resolve(CoreCryptoTransactionUsernameRegistration).register();
	await app.resolve(CoreCryptoTransactionTransfer).register();
	await app.resolve(CoreCryptoTransactionVote).register();

	// @ts-ignore
	app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setConfig({
		milestones: [{ address: addressMilestone, blockTime: 8000, height: 0 }],
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
