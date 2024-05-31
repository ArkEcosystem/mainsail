import { Identifiers } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CoreCryptoConfig } from "@mainsail/crypto-config";
import { ServiceProvider as CoreCryptoConsensus } from "@mainsail/crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairEcdsa } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "@mainsail/crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { ServiceProvider as CoreCryptoTransactionTransfer } from "@mainsail/crypto-transaction-transfer";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/crypto-wif";
import { ServiceProvider as CoreFees } from "@mainsail/fees";
import { ServiceProvider as CoreFeesStatic } from "@mainsail/fees-static";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";

import crypto from "../../../core/bin/config/testnet/core/crypto.json";
import { Sandbox } from "../../../test-framework/source";
import { Deserializer } from "../../source/deserializer";
import { BlockFactory } from "../../source/factory";
import { IDFactory } from "../../source/id.factory";
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
	await context.sandbox.app.resolve(CoreCryptoSignatureSchnorr).register();
	await context.sandbox.app.resolve(CoreCryptoConsensus).register();
	await context.sandbox.app.resolve(CoreCryptoKeyPairEcdsa).register();
	await context.sandbox.app.resolve(CoreCryptoAddressKeccak256).register();
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
