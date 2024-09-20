import { Contracts, Identifiers } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CoreCryptoBlock } from "@mainsail/crypto-block";
import { ServiceProvider as CoreCryptoCommit } from "@mainsail/crypto-commit";
import { Configuration } from "@mainsail/crypto-config";
import { ServiceProvider as CoreCryptoConsensus } from "@mainsail/crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairEcdsa } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as CoreCryptoMessages } from "@mainsail/crypto-messages";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "@mainsail/crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { ServiceProvider as CoreEvmCallTransaction } from "@mainsail/crypto-transaction-evm-call";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/crypto-wif";
import { ServiceProvider as CoreEvmGasFee } from "@mainsail/evm-gas-fee";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";

import { Sandbox } from "../../app/sandbox.js";

export const generateApp = async (
	config: Contracts.Crypto.NetworkConfigPartial,
): Promise<Contracts.Kernel.Application> => {
	const sandbox = new Sandbox();

	sandbox.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({});
	sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue({});

	sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
	sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(config);

	await sandbox.app.resolve(CoreValidation).register();
	await sandbox.app.resolve(CoreCryptoValidation).register();
	await sandbox.app.resolve(CoreCryptoAddressKeccak256).register();
	await sandbox.app.resolve(CoreCryptoKeyPairEcdsa).register();
	await sandbox.app.resolve(CoreCryptoSignatureSchnorr).register();
	await sandbox.app.resolve(CoreCryptoHashBcrypto).register();
	await sandbox.app.resolve(CoreCryptoConsensus).register();
	await sandbox.app.resolve(CoreEvmGasFee).register();
	await sandbox.app.resolve(CoreCryptoTransaction).register();
	await sandbox.app.resolve(CoreEvmCallTransaction).register();
	await sandbox.app.resolve(CoreCryptoBlock).register();
	await sandbox.app.resolve(CoreCryptoMessages).register();
	await sandbox.app.resolve(CoreCryptoCommit).register();
	await sandbox.app.resolve(CoreSerializer).register();
	await sandbox.app.resolve(CoreCryptoWif).register();

	return sandbox.app;
};
