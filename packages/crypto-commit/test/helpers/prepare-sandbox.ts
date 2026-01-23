import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressBase58 } from "@mainsail/crypto-address-base58";
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
import { Application } from "@mainsail/kernel";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";

import crypto from "../../../core/bin/config/devnet/core/crypto.json";
import { Deserializer } from "../../source/deserializer";
import { Serializer } from "../../source/serializer";

export const prepareSandbox = async (context) => {
	context.app = new Application();

	context.app.bind(Identifiers.Cryptography.Commit.ProofSize).toConstantValue(
		() =>
			4 + // round
			context.app.getTagged<number>(Identifiers.Cryptography.Signature.Size, "type", "consensus") + // signature
			1 +
			8, // validator set bitmap);
	);

	context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", crypto);
	context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({ dispatchSync: () => {} });
	context.app.bind(Identifiers.Services.Log.Service).toConstantValue({});

	await context.app.resolve(CoreSerializer).register();
	await context.app.resolve(CoreValidation).register();
	await context.app.resolve(CoreCryptoConfig).register();
	await context.app.resolve(CoreCryptoValidation).register();
	await context.app.resolve(CoreCryptoHashBcrypto).register();
	await context.app.resolve(CoreCryptoSignatureEcdsa).register();
	await context.app.resolve(CoreCryptoConsensus).register();
	await context.app.resolve(CoreCryptoKeyPairSchnorr).register();
	await context.app.resolve(CoreCryptoAddressKeccak256).register();
	await context.app.resolve(CoreCryptoAddressBase58).register();
	await context.app.resolve(CoreCryptoWif).register();
	await context.app.resolve(CoreCryptoTransaction).register();
	await context.app.resolve(CoreCryptoBlock).register();
	await context.app.resolve(CoreCryptoMessages).register();

	context.app.bind(Identifiers.Cryptography.Commit.Serializer).to(Serializer);
	context.app.bind(Identifiers.Cryptography.Commit.Deserializer).to(Deserializer);
};
