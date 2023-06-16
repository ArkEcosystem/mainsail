import { Identifiers } from "@mainsail/contracts";

import crypto from "../../../core/bin/config/testnet/crypto.json";
import validatorsJson from "../../../core/bin/config/testnet/validators.json";
import { ServiceProvider as CoreCryptoAddressBech32m } from "../../../crypto-address-bech32m";
import { ServiceProvider as CryptoBlock } from "../../../crypto-block";
import { ServiceProvider as CoreCryptoConfig } from "../../../crypto-config";
import { Configuration } from "../../../crypto-config/source/configuration";
import { ServiceProvider as CoreConsensusBls12381 } from "../../../crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "../../../crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "../../../crypto-key-pair-schnorr";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "../../../crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTransaction } from "../../../crypto-transaction";
import { ServiceProvider as CoreCryptoWif } from "../../../crypto-wif";
import { ServiceProvider as CoreSerializer } from "../../../serializer";
import { ServiceProvider as CoreState } from "../../../state";
import { Sandbox } from "../../../test-framework";
import { ServiceProvider as CoreTransactions } from "../../../transactions";
import { ServiceProvider as CoreValidation } from "../../../validation";
import { ServiceProvider as CoreValidatorSet } from "../../../validator-set-static";
import { Deserializer } from "../../source/deserializer";
import { MessageFactory } from "../../source/factory";
import { Serializer } from "../../source/serializer";
import { Verifier } from "../../source/verifier";

export const prepareSandbox = async (context) => {
	context.sandbox = new Sandbox();

	await context.sandbox.app.resolve(CoreSerializer).register();
	await context.sandbox.app.resolve(CoreValidation).register();
	await context.sandbox.app.resolve(CoreCryptoConfig).register();

	await context.sandbox.app.resolve(CoreCryptoHashBcrypto).register();

	await context.sandbox.app.resolve(CoreCryptoSignatureSchnorr).register();
	await context.sandbox.app.resolve(CoreCryptoKeyPairSchnorr).register();

	await context.sandbox.app.resolve(CoreCryptoAddressBech32m).register();
	await context.sandbox.app.resolve(CoreCryptoWif).register();
	await context.sandbox.app.resolve(CoreConsensusBls12381).register();
	await context.sandbox.app.resolve(CoreCryptoTransaction).register();
	await context.sandbox.app.resolve(CoreTransactions).register();
	await context.sandbox.app.resolve(CryptoBlock).register();

	context.sandbox.app.bind(Identifiers.EventDispatcherService).toConstantValue({ dispatchSync: () => {} });

	context.sandbox.app.get(Identifiers.WalletAttributes).set("validator");
	context.sandbox.app.get(Identifiers.WalletAttributes).set("validator.username");
	context.sandbox.app.get(Identifiers.WalletAttributes).set("validator.resigned");

	await context.sandbox.app.resolve(CoreState).register();
	await context.sandbox.app.resolve(CoreValidatorSet).register();

	const walletRepository = context.sandbox.app.getTagged(Identifiers.WalletRepository, "state", "blockchain");

	const secrets: string[] = [];
	const consensusPublicKeyFactory = context.sandbox.app.getTagged(
		Identifiers.Cryptography.Identity.PublicKeyFactory,
		"type",
		"consensus",
	);
	for (let index = 0; index < validatorsJson.secrets.length; index++) {
		const mnemonic = validatorsJson.secrets[index];
		const wallet = walletRepository.findByAddress(mnemonic);
		wallet.setAttribute("validator.username", `genesis_${index + 1}`);
		wallet.setAttribute("consensus.publicKey", await consensusPublicKeyFactory.fromMnemonic(mnemonic));

		walletRepository.index(wallet);
		secrets.push(mnemonic);
	}

	context.sandbox.app.get(Identifiers.ConfigRepository).set("validators", {
		secrets,
	});

	context.sandbox.app.bind(Identifiers.Cryptography.Message.Serializer).to(Serializer);
	context.sandbox.app.bind(Identifiers.Cryptography.Message.Deserializer).to(Deserializer);
	context.sandbox.app.bind(Identifiers.Cryptography.Message.Verifier).to(Verifier).inSingletonScope();
	context.sandbox.app.bind(Identifiers.Cryptography.Message.Factory).to(MessageFactory).inSingletonScope();

	// @ts-ignore
	context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(crypto);
};
