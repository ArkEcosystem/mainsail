import { Identifiers } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CoreCryptoBlock } from "@mainsail/crypto-block";
import { ServiceProvider as CoreCryptoConfig } from "@mainsail/crypto-config";
import { ServiceProvider as CoreCryptoConsensus } from "@mainsail/crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "@mainsail/crypto-key-pair-schnorr";
import { ServiceProvider as CoreCryptoMessages } from "@mainsail/crypto-messages";
import { ServiceProvider as CoreCryptoSignatureEcdsa } from "@mainsail/crypto-signature-ecdsa";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/crypto-wif";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";

import crypto from "../../../core/bin/config/testnet/core/crypto.json";
import { Sandbox } from "../../../test-framework/source";
import { Deserializer } from "../../source/deserializer";
import { Serializer } from "../../source/serializer";

export const prepareSandbox = async (context) => {
	context.sandbox = new Sandbox();

	context.sandbox.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", crypto);
	context.sandbox.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({ dispatchSync: () => {} });
	context.sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue({});

	await context.sandbox.app.resolve(CoreSerializer).register();
	await context.sandbox.app.resolve(CoreValidation).register();
	await context.sandbox.app.resolve(CoreCryptoConfig).register();
	await context.sandbox.app.resolve(CoreCryptoValidation).register();
	await context.sandbox.app.resolve(CoreCryptoHashBcrypto).register();
	await context.sandbox.app.resolve(CoreCryptoSignatureEcdsa).register();
	await context.sandbox.app.resolve(CoreCryptoConsensus).register();
	await context.sandbox.app.resolve(CoreCryptoKeyPairSchnorr).register();
	await context.sandbox.app.resolve(CoreCryptoAddressKeccak256).register();
	await context.sandbox.app.resolve(CoreCryptoWif).register();
	await context.sandbox.app.resolve(CoreCryptoTransaction).register();
	await context.sandbox.app.resolve(CoreCryptoBlock).register();
	await context.sandbox.app.resolve(CoreCryptoMessages).register();

	context.sandbox.app.bind(Identifiers.Cryptography.Commit.Serializer).to(Serializer);
	context.sandbox.app.bind(Identifiers.Cryptography.Commit.Deserializer).to(Deserializer);
};
