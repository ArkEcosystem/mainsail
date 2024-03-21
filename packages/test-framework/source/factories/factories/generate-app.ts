import { Contracts, Identifiers } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressBech32m } from "@mainsail/crypto-address-bech32m";
import { ServiceProvider as CoreCryptoBlock } from "@mainsail/crypto-block";
import { ServiceProvider as CoreCryptoCommit } from "@mainsail/crypto-commit";
import { Configuration } from "@mainsail/crypto-config";
import { ServiceProvider as CoreCryptoConsensus } from "@mainsail/crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "@mainsail/crypto-key-pair-schnorr";
import { ServiceProvider as CoreCryptoMessages } from "@mainsail/crypto-messages";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "@mainsail/crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { ServiceProvider as CoreMultiPaymentTransaction } from "@mainsail/crypto-transaction-multi-payment";
import { ServiceProvider as CoreMultiSignatureRegistrationTransaction } from "@mainsail/crypto-transaction-multi-signature-registration";
import { ServiceProvider as CoreTransferTransaction } from "@mainsail/crypto-transaction-transfer";
import { ServiceProvider as CoreValidatorRegistrationTransaction } from "@mainsail/crypto-transaction-validator-registration";
import { ServiceProvider as CoreValidatorResignationTransaction } from "@mainsail/crypto-transaction-validator-resignation";
import { ServiceProvider as CoreVoteTransaction } from "@mainsail/crypto-transaction-vote";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/crypto-wif";
import { ServiceProvider as CoreFees } from "@mainsail/fees";
import { ServiceProvider as CoreFeesStatic } from "@mainsail/fees-static";
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
	await sandbox.app.resolve(CoreCryptoAddressBech32m).register();
	await sandbox.app.resolve(CoreCryptoKeyPairSchnorr).register();
	await sandbox.app.resolve(CoreCryptoSignatureSchnorr).register();
	await sandbox.app.resolve(CoreCryptoHashBcrypto).register();
	await sandbox.app.resolve(CoreCryptoConsensus).register();
	await sandbox.app.resolve(CoreFees).register();
	await sandbox.app.resolve(CoreFeesStatic).register();
	await sandbox.app.resolve(CoreCryptoTransaction).register();
	await sandbox.app.resolve(CoreTransferTransaction).register();
	await sandbox.app.resolve(CoreVoteTransaction).register();
	await sandbox.app.resolve(CoreValidatorRegistrationTransaction).register();
	await sandbox.app.resolve(CoreValidatorResignationTransaction).register();
	await sandbox.app.resolve(CoreMultiSignatureRegistrationTransaction).register();
	await sandbox.app.resolve(CoreMultiPaymentTransaction).register();
	await sandbox.app.resolve(CoreCryptoBlock).register();
	await sandbox.app.resolve(CoreCryptoMessages).register();
	await sandbox.app.resolve(CoreCryptoCommit).register();
	await sandbox.app.resolve(CoreSerializer).register();
	await sandbox.app.resolve(CoreCryptoWif).register();

	return sandbox.app;
};
