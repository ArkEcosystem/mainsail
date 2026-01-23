import { Identifiers } from "@mainsail/constants";
import { Container } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressBase58 } from "@mainsail/crypto-address-base58";
import { ServiceProvider as CoreCryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CryptoBlock } from "@mainsail/crypto-block";
import { ServiceProvider as CoreCryptoConfig } from "@mainsail/crypto-config";
import { ServiceProvider as CoreConsensusBls12381 } from "@mainsail/crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairEcdsa } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as CoreCryptoSignatureEcdsa } from "@mainsail/crypto-signature-ecdsa";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/crypto-wif";
import { Application } from "@mainsail/kernel";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";
import { ServiceProvider as CoreTransactions } from "@mainsail/transactions";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";

import crypto from "../../../core/bin/config/devnet/core/crypto.json" with { type: "json" };
import { Deserializer } from "../../source/deserializer.js";
import { Factory } from "../../source/factory.js";
import { makeKeywords } from "../../source/keywords.js";
import { schemas } from "../../source/schemas.js";
import { Serializer } from "../../source/serializer.js";

export const prepareSandbox = async (context: { app?: Application }): Promise<void> => {
	context.app = new Application(new Container());

	context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", crypto);

	await context.app.resolve(CoreSerializer).register();
	await context.app.resolve(CoreValidation).register();
	await context.app.resolve(CoreCryptoConfig).register();

	context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({ dispatchSync: () => { } });
	context.app.bind(Identifiers.Services.Log.Service).toConstantValue({});

	await context.app.resolve(CoreCryptoHashBcrypto).register();
	await context.app.resolve(CoreCryptoSignatureEcdsa).register();
	await context.app.resolve(CoreCryptoKeyPairEcdsa).register();
	await context.app.resolve(CoreCryptoAddressKeccak256).register();
	await context.app.resolve(CoreCryptoAddressBase58).register();
	await context.app.resolve(CoreCryptoWif).register();
	await context.app.resolve(CoreConsensusBls12381).register();
	await context.app.resolve(CoreCryptoTransaction).register();
	await context.app.resolve(CoreTransactions).register();
	await context.app.resolve(CoreCryptoValidation).register();
	await context.app.resolve(CryptoBlock).register();

	context.app.bind(Identifiers.Cryptography.Proposal.Serializer).to(Serializer);
	context.app.bind(Identifiers.Cryptography.Proposal.Deserializer).to(Deserializer);
	context.app.bind(Identifiers.Cryptography.Proposal.Factory).to(Factory).inSingletonScope();
	context.app.bind(Identifiers.Cryptography.Proposal.LockProofSize).toConstantValue(() => {
		const signatureSize = context.app!.getTagged<number>(
			Identifiers.Cryptography.Signature.Size,
			"type",
			"consensus",
		);

		return (
			signatureSize + // signature
			1 +
			8 // validator set bitmap
		);
	});

	for (const keyword of Object.values(
		makeKeywords(context.app.get(Identifiers.Cryptography.Configuration)),
	)) {
		context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addKeyword(keyword);
	}

	for (const schema of Object.values(schemas)) {
		context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
	}
};
