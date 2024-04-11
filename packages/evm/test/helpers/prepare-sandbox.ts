import { Contracts, Identifiers } from "@mainsail/contracts";

import crypto from "../../../core/bin/config/testnet/core/crypto.json";
import { ServiceProvider as CoreCryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CoreCryptoBlock } from "@mainsail/crypto-block";
import { ServiceProvider as CoreCryptoConfig } from "@mainsail/crypto-config";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairEcdsa } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "@mainsail/crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/crypto-wif";
import { ServiceProvider as CoreEvents } from "@mainsail/kernel/source/services/events";
import { ServiceProvider as CoreTriggers } from "@mainsail/kernel/source/services/triggers";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";
import { Sandbox } from "@mainsail/test-framework";
import { ServiceProvider as CoreTransactions } from "@mainsail/transactions";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";

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
