import { Identifiers } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";

import crypto from "../../../core/bin/config/testnet/crypto.json";
import { ServiceProvider as CoreCryptoAddressBech32m } from "../../../crypto-address-bech32";
import { ServiceProvider as CoreCryptoConfig } from "../../../crypto-config/distribution";
import { Configuration } from "../../../crypto-config/source/configuration";
import { ServiceProvider as CoreCryptoHashBcrypto } from "../../../crypto-hash-bcrypto/distribution";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "../../../crypto-key-pair-schnorr/distribution";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "../../../crypto-signature-schnorr/distribution";
import { ServiceProvider as CoreCryptoTime } from "../../../crypto-time/distribution";
import { ServiceProvider as CoreCryptoTransactionTransfer } from "../../../crypto-transaction-transfer/distribution";
import { ServiceProvider as CoreCryptoValidation } from "../../../crypto-validation/distribution";
import { ServiceProvider as CoreCryptoWif } from "../../../crypto-wif/distribution";
import { ServiceProvider as CoreFees } from "../../../fees/distribution";
import { ServiceProvider as CoreFeesStatic } from "../../../fees-static/distribution";
import { ServiceProvider as CoreSerializer } from "../../../serializer/distribution";
import { Sandbox } from "../../../test-framework/distribution";
import { ServiceProvider as CoreValidation } from "../../../validation/distribution";
import { Deserializer } from "../../source/deserializer";
import { IDFactory } from "../../source/id.factory";
import { Serializer } from "../../source/serializer";

export const prepareSandbox = async (context) => {
	context.sandbox = new Sandbox();

	await context.sandbox.app.resolve(CoreSerializer).register();
	await context.sandbox.app.resolve(CoreValidation).register();
	await context.sandbox.app.resolve(CoreCryptoConfig).register();
	await context.sandbox.app.resolve(CoreCryptoTime).register();
	await context.sandbox.app.resolve(CoreCryptoValidation).register();
	await context.sandbox.app.resolve(CoreCryptoHashBcrypto).register();
	await context.sandbox.app.resolve(CoreCryptoSignatureSchnorr).register();
	await context.sandbox.app.resolve(CoreCryptoKeyPairSchnorr).register();
	await context.sandbox.app.resolve(CoreCryptoAddressBech32m).register();
	await context.sandbox.app.resolve(CoreCryptoWif).register();
	await context.sandbox.app.resolve(CoreFees).register();
	await context.sandbox.app.resolve(CoreFeesStatic).register();
	await context.sandbox.app.resolve(CoreCryptoTransaction).register();
	await context.sandbox.app.resolve(CoreCryptoTransactionTransfer).register();
	context.sandbox.app.bind(Identifiers.Cryptography.Block.Serializer).to(Serializer);
	context.sandbox.app.bind(Identifiers.Cryptography.Block.Deserializer).to(Deserializer);
	context.sandbox.app.bind(Identifiers.Cryptography.Block.IDFactory).to(IDFactory);

	context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(crypto);
};
