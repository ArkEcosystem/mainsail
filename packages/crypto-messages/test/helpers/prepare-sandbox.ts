import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services } from "@mainsail/kernel";

import crypto from "../../../core/bin/config/testnet/crypto.json";
import { ServiceProvider as CoreCryptoAddressBech32m } from "../../../crypto-address-bech32m";
import { ServiceProvider as CryptoBlock } from "../../../crypto-block";
import { ServiceProvider as CoreCryptoConfig } from "../../../crypto-config";
import { ServiceProvider as CoreConsensusBls12381 } from "../../../crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "../../../crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "../../../crypto-key-pair-schnorr";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "../../../crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTransaction } from "../../../crypto-transaction";
import { ServiceProvider as CoreCryptoTransactionTransfer } from "../../../crypto-transaction-transfer";
import { ServiceProvider as CoreCryptoValidation } from "../../../crypto-validation";
import { ServiceProvider as CoreFees } from "../../../fees";
import { ServiceProvider as CoreFeesStatic } from "../../../fees-static";
import { ServiceProvider as CoreCryptoWif } from "../../../crypto-wif";
import { ServiceProvider as CoreSerializer } from "../../../serializer";
import { ServiceProvider as CoreState } from "../../../state";
import { Sandbox } from "../../../test-framework";
import { ServiceProvider as CoreTransactions } from "../../../transactions";
import { ServiceProvider as CoreValidation } from "../../../validation";
import { Deserializer } from "../../source/deserializer";
import { MessageFactory } from "../../source/factory";
import { Serializer } from "../../source/serializer";
import { Verifier } from "../../source/verifier";
import { schemas } from "../../source/schemas";

export const prepareSandbox = async (context: { sandbox?: Sandbox }) => {
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
	await context.sandbox.app.resolve(CoreFees).register();
	await context.sandbox.app.resolve(CoreFeesStatic).register();
	await context.sandbox.app.resolve(CoreCryptoTransaction).register();
	await context.sandbox.app.resolve(CoreCryptoTransactionTransfer).register();
	await context.sandbox.app.resolve(CoreTransactions).register();
	await context.sandbox.app.resolve(CoreCryptoValidation).register();
	await context.sandbox.app.resolve(CryptoBlock).register();

	context.sandbox.app.bind(Identifiers.EventDispatcherService).toConstantValue({ dispatchSync: () => {} });

	await context.sandbox.app.resolve(CoreState).register();

	context.sandbox.app.bind(Identifiers.Cryptography.Message.Serializer).to(Serializer);
	context.sandbox.app.bind(Identifiers.Cryptography.Message.Deserializer).to(Deserializer);
	context.sandbox.app.bind(Identifiers.Cryptography.Message.Verifier).to(Verifier).inSingletonScope();
	context.sandbox.app.bind(Identifiers.Cryptography.Message.Factory).to(MessageFactory).inSingletonScope();

	for (const schema of Object.values(schemas)) {
		context.sandbox.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator).addSchema(schema);
	}

	context.sandbox.app
		.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes)
		.set("validator.consensusPublicKey");

	context.sandbox.app.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration).setConfig(crypto);
};
