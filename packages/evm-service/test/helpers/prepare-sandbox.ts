import { Identifiers } from "@mainsail/constants";
import { Container } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressBase58 } from "@mainsail/crypto-address-base58";
import { ServiceProvider as CoreCryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CoreCryptoBlock } from "@mainsail/crypto-block";
import { ServiceProvider as CoreCryptoCommit } from "@mainsail/crypto-commit";
import { ServiceProvider as CoreCryptoConfig } from "@mainsail/crypto-config";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairEcdsa } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as CoreCryptoSignatureEcdsa } from "@mainsail/crypto-signature-ecdsa";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/crypto-wif";
import { Application } from "@mainsail/kernel";
import { ServiceProvider as CoreEvents } from "@mainsail/kernel/source/services/events";
import { ServiceProvider as CoreTriggers } from "@mainsail/kernel/source/services/triggers";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";
import { ServiceProvider as CoreTransactions } from "@mainsail/transactions";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";
import { dirSync } from "tmp";

import crypto from "../../../core/bin/config/devnet/core/crypto.json";

export const prepareSandbox = async (context: { app?: Application }) => {
	context.app = new Application(new Container());

	await context.app.resolve(CoreTriggers).register();
	await context.app.resolve(CoreEvents).register();

	await context.app.resolve(CoreSerializer).register();
	await context.app.resolve(CoreValidation).register();

	try {
		await context.app.resolve(CoreCryptoConfig).register();
	} catch { }

	await context.app.resolve(CoreCryptoHashBcrypto).register();

	await context.app.resolve(CoreCryptoSignatureEcdsa).register();
	await context.app.resolve(CoreCryptoKeyPairEcdsa).register();

	await context.app.resolve(CoreCryptoAddressKeccak256).register();
	await context.app.resolve(CoreCryptoAddressBase58).register();
	await context.app.resolve(CoreCryptoValidation).register();
	await context.app.resolve(CoreCryptoWif).register();

	context.app.bind(Identifiers.Services.Log.Service).toConstantValue({
		info: (msg) => console.log(msg),
		debug: (msg) => console.log(msg),
	});
	context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setConfig(crypto);

	context.app.bind(Identifiers.Services.Filesystem.Service).toConstantValue({ existsSync: () => true });
	context.app.useDataPath(dirSync().name);

	await context.app.resolve(CoreCryptoTransaction).register();
	await context.app.resolve(CoreTransactions).register();
	await context.app.resolve(CoreCryptoBlock).register();
	await context.app.resolve(CoreCryptoCommit).register();

	context.app.bind(Identifiers.State.Store).toConstantValue({
		getLastBlock: () => ({
			data: {
				number: 1,
				id: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		}),
	});
};
