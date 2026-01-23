import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressBase58 } from "@mainsail/crypto-address-base58";
import { ServiceProvider as CoreCryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CoreCryptoBlock } from "@mainsail/crypto-block";
import { ServiceProvider as CoreCryptoCommit } from "@mainsail/crypto-commit";
import { Configuration } from "@mainsail/crypto-config";
import { ServiceProvider as CoreCryptoConsensus } from "@mainsail/crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairEcdsa } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as CoreCryptoMessages } from "@mainsail/crypto-messages";
import { ServiceProvider as CoreCryptoSignatureEcdsa } from "@mainsail/crypto-signature-ecdsa";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/crypto-wif";
import { Application } from "@mainsail/kernel";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";

export const generateApp = async (
	config: Contracts.Crypto.NetworkConfigPartial,
): Promise<Contracts.Kernel.Application> => {
	const app = new Application();

	app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({});
	app.bind(Identifiers.Services.Log.Service).toConstantValue({});

	app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
	app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(config);

	await app.resolve(CoreValidation).register();
	await app.resolve(CoreCryptoValidation).register();
	await app.resolve(CoreCryptoAddressKeccak256).register();
	await app.resolve(CoreCryptoAddressBase58).register();
	await app.resolve(CoreCryptoKeyPairEcdsa).register();
	await app.resolve(CoreCryptoSignatureEcdsa).register();
	await app.resolve(CoreCryptoHashBcrypto).register();
	await app.resolve(CoreCryptoConsensus).register();
	await app.resolve(CoreCryptoTransaction).register();
	await app.resolve(CoreCryptoBlock).register();
	await app.resolve(CoreCryptoMessages).register();
	await app.resolve(CoreCryptoCommit).register();
	await app.resolve(CoreSerializer).register();
	await app.resolve(CoreCryptoWif).register();

	return app;
};
