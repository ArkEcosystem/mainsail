import { Contracts, Identifiers } from "@mainsail/contracts";

import crypto from "../../../core/bin/config/testnet/core/crypto.json";
import { ServiceProvider as CoreCryptoAddressKeccak256 } from "../../../crypto-address-keccak256";
import { ServiceProvider as CoreCryptoBlock } from "../../../crypto-block";
import { ServiceProvider as CoreCryptoConfig } from "../../../crypto-config";
import { ServiceProvider as CoreCryptoHashBcrypto } from "../../../crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairEcdsa } from "../../../crypto-key-pair-ecdsa";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "../../../crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTransaction } from "../../../crypto-transaction";
import { ServiceProvider as CoreCryptoValidation } from "../../../crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "../../../crypto-wif";
import { ServiceProvider as CoreEvents } from "../../../kernel/source/services/events";
import { ServiceProvider as CoreTriggers } from "../../../kernel/source/services/triggers";
import { ServiceProvider as CoreSerializer } from "../../../serializer";
import { Sandbox } from "../../../test-framework";
import { ServiceProvider as CoreTransactions } from "../../../transactions";
import { ServiceProvider as CoreValidation } from "../../../validation";

export const prepareSandbox = async (context: { sandbox?: Sandbox }) => {
	context.sandbox = new Sandbox();

	await context.sandbox.app.resolve(CoreTriggers).register();
	await context.sandbox.app.resolve(CoreEvents).register();

	await context.sandbox.app.resolve(CoreSerializer).register();
	await context.sandbox.app.resolve(CoreValidation).register();
	await context.sandbox.app.resolve(CoreCryptoConfig).register();

	await context.sandbox.app.resolve(CoreCryptoHashBcrypto).register();

	await context.sandbox.app.resolve(CoreCryptoSignatureSchnorr).register();
	await context.sandbox.app.resolve(CoreCryptoKeyPairEcdsa).register();

	await context.sandbox.app.resolve(CoreCryptoAddressKeccak256).register();
	await context.sandbox.app.resolve(CoreCryptoValidation).register();
	await context.sandbox.app.resolve(CoreCryptoWif).register();

	context.sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue({});
	context.sandbox.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setConfig(crypto);

	await context.sandbox.app.resolve(CoreCryptoTransaction).register();
	await context.sandbox.app.resolve(CoreTransactions).register();
	await context.sandbox.app.resolve(CoreCryptoBlock).register();

	context.sandbox.app.bind(Identifiers.State.Service).toConstantValue({
		getStore: () => ({
			getLastBlock: () => ({
				data: {
					height: 1,
					id: "0000000000000000000000000000000000000000000000000000000000000000",
				},
			}),
		}),
	});
};
