import { Identifiers } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";

import crypto from "../../../core/bin/config/testnet/core/crypto.json";
import { ServiceProvider as CoreCryptoAddressBech32m } from "../../../crypto-address-bech32m";
import { ServiceProvider as CoreCryptoConfig } from "../../../crypto-config";
import { ServiceProvider as CoreCryptoConsensus } from "../../../crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "../../../crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "../../../crypto-key-pair-schnorr";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "../../../crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTransactionTransfer } from "../../../crypto-transaction-transfer";
import { ServiceProvider as CoreCryptoValidation } from "../../../crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "../../../crypto-wif";
import { ServiceProvider as CoreFees } from "../../../fees";
import { ServiceProvider as CoreFeesStatic } from "../../../fees-static";
import { ServiceProvider as CoreSerializer } from "../../../serializer";
import { Sandbox } from "../../../test-framework";
import { ServiceProvider as CoreValidation } from "../../../validation";
import { Deserializer } from "../../source/deserializer";
import { BlockFactory } from "../../source/factory";
import { IDFactory } from "../../source/id.factory";
import { Serializer } from "../../source/serializer";

export const prepareSandbox = async (context) => {
	context.sandbox = new Sandbox();

	context.sandbox.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", crypto);

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
	await context.sandbox.app.resolve(CoreCryptoTransactionTransfer).register();
	context.sandbox.app.bind(Identifiers.Cryptography.Block.Serializer).to(Serializer);
	context.sandbox.app.bind(Identifiers.Cryptography.Block.Deserializer).to(Deserializer);
	context.sandbox.app.bind(Identifiers.Cryptography.Block.IDFactory).to(IDFactory);
	context.sandbox.app.bind(Identifiers.Cryptography.Block.Factory).to(BlockFactory);
};
