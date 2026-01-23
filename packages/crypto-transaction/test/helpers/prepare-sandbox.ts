import { Identifiers } from "@mainsail/constants";
import { Container } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressBase58 } from "@mainsail/crypto-address-base58";
import { ServiceProvider as CoreCryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CoreCryptoConfig } from "@mainsail/crypto-config";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairEcdsa } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as CoreCryptoSignatureEcdsa } from "@mainsail/crypto-signature-ecdsa";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/crypto-wif";
import { Application } from "@mainsail/kernel";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";
import { ServiceProvider as CoreTransactions } from "@mainsail/transactions";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";

import crypto from "../../../core/bin/config/devnet/core/crypto.json" with { type: "json" };
import { ServiceProvider as CoreCryptoTransaction } from "../../source/service-provider.js";

export const prepareSandbox = async (context: { app: Application }) => {
	context.app = new Application(new Container());

	context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", crypto);
	context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({ dispatchSync: () => {} });
	context.app.bind(Identifiers.Services.Log.Service).toConstantValue({});

	await context.app.resolve(CoreSerializer).register();
	await context.app.resolve(CoreValidation).register();
	await context.app.resolve(CoreCryptoConfig).register();
	await context.app.resolve(CoreCryptoValidation).register();
	await context.app.resolve(CoreCryptoHashBcrypto).register();
	await context.app.resolve(CoreCryptoSignatureEcdsa).register();
	await context.app.resolve(CoreCryptoKeyPairEcdsa).register();
	await context.app.resolve(CoreCryptoAddressBase58).register();
	await context.app.resolve(CoreCryptoAddressKeccak256).register();
	await context.app.resolve(CoreCryptoWif).register();
	await context.app.resolve(CoreTransactions).register();
	await context.app.resolve(CoreCryptoTransaction).register();
};
