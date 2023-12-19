import { Identifiers } from "@mainsail/contracts";

import crypto from "../../../core/bin/config/testnet/mainsail/crypto.json";
import { ServiceProvider as CoreCryptoAddressBech32m } from "../../../crypto-address-bech32m";
import { ServiceProvider as CoreCryptoConfig } from "../../../crypto-config";
import { ServiceProvider as CoreCryptoConsensus } from "../../../crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "../../../crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "../../../crypto-key-pair-schnorr";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "../../../crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoValidation } from "../../../crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "../../../crypto-wif";
import { ServiceProvider as CoreFees } from "../../../fees";
import { ServiceProvider as CoreFeesStatic } from "../../../fees-static";
import { ServiceProvider as CoreSerializer } from "../../../serializer";
import { ServiceProvider as CoreCryptoBlock } from "../../../crypto-block";
import { ServiceProvider as CoreCryptoMessages } from "../../../crypto-messages";
import { ServiceProvider as CoreCryptoTransaction } from "../../../crypto-transaction";
import { Sandbox } from "../../../test-framework";
import { ServiceProvider as CoreValidation } from "../../../validation";
import { Serializer } from "../../source/serializer";
import { Deserializer } from "../../source/deserializer";

export const prepareSandbox = async (context) => {
	context.sandbox = new Sandbox();

	context.sandbox.app.get<Contracts.Kernel.Repository>(Identifiers.ConfigRepository).set("crypto", crypto);

	await context.sandbox.app.resolve(CoreSerializer).register();
	await context.sandbox.app.resolve(CoreValidation).register();
	await context.sandbox.app.resolve(CoreCryptoConfig).register();
	await context.sandbox.app.resolve(CoreCryptoValidation).register();
	await context.sandbox.app.resolve(CoreCryptoHashBcrypto).register();
	await context.sandbox.app.resolve(CoreCryptoSignatureSchnorr).register();
	await context.sandbox.app.resolve(CoreCryptoConsensus).register();
	await context.sandbox.app.resolve(CoreCryptoKeyPairSchnorr).register();
	await context.sandbox.app.resolve(CoreCryptoAddressBech32m).register();
	await context.sandbox.app.resolve(CoreCryptoWif).register();
	await context.sandbox.app.resolve(CoreFees).register();
	await context.sandbox.app.resolve(CoreFeesStatic).register();
	await context.sandbox.app.resolve(CoreCryptoTransaction).register();
	await context.sandbox.app.resolve(CoreCryptoBlock).register();
	await context.sandbox.app.resolve(CoreCryptoMessages).register();

	context.sandbox.app.bind(Identifiers.Cryptography.Commit.Serializer).to(Serializer);
	context.sandbox.app.bind(Identifiers.Cryptography.Commit.Deserializer).to(Deserializer);
};
