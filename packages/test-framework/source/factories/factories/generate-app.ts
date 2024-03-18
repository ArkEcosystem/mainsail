import { Contracts, Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";

import { ServiceProvider as CoreCryptoAddressKeccak256 } from "../../../../crypto-address-keccak256/source/index.js";
import { ServiceProvider as CoreCryptoBlock } from "../../../../crypto-block/source/index.js";
import { ServiceProvider as CoreCryptoCommit } from "../../../../crypto-commit/source/index.js";
import { ServiceProvider as CoreCryptoConsensus } from "../../../../crypto-consensus-bls12-381/source/index.js";
import { ServiceProvider as CoreCryptoHashBcrypto } from "../../../../crypto-hash-bcrypto/source/index.js";
import { ServiceProvider as CoreCryptoKeyPairEcdsa } from "../../../../crypto-key-pair-ecdsa/source/index.js";
import { ServiceProvider as CoreEvmCallTransaction } from "../../../../crypto-transaction-evm-call/source/index.js";
import { ServiceProvider as CoreCryptoMessages } from "../../../../crypto-messages/source/index.js";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "../../../../crypto-signature-schnorr/source/index.js";
import { ServiceProvider as CoreCryptoTransaction } from "../../../../crypto-transaction/source/index.js";
import { ServiceProvider as CoreMultiPaymentTransaction } from "../../../../crypto-transaction-multi-payment/source/index.js";
import { ServiceProvider as CoreMultiSignatureRegistrationTransaction } from "../../../../crypto-transaction-multi-signature-registration/source/index.js";
import { ServiceProvider as CoreTransferTransaction } from "../../../../crypto-transaction-transfer/source/index.js";
import { ServiceProvider as CoreValidatorRegistrationTransaction } from "../../../../crypto-transaction-validator-registration/source/index.js";
import { ServiceProvider as CoreValidatorResignationTransaction } from "../../../../crypto-transaction-validator-resignation/source/index.js";
import { ServiceProvider as CoreVoteTransaction } from "../../../../crypto-transaction-vote/source/index.js";
import { ServiceProvider as CoreCryptoValidation } from "../../../../crypto-validation/source/index.js";
import { ServiceProvider as CoreCryptoWif } from "../../../../crypto-wif/source/index.js";
import { ServiceProvider as CoreFees } from "../../../../fees/source/index.js";
import { ServiceProvider as CoreFeesStatic } from "../../../../fees-static/source/index.js";
import { ServiceProvider as CoreSerializer } from "../../../../serializer/source/index.js";
import { ServiceProvider as CoreValidation } from "../../../../validation/source/index.js";
import { Sandbox } from "../../app/sandbox.js";

export const generateApp = async (
	config: Contracts.Crypto.NetworkConfigPartial,
): Promise<Contracts.Kernel.Application> => {
	const sandbox = new Sandbox();

	sandbox.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({});

	sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
	sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(config);

	await sandbox.app.resolve(CoreValidation).register();
	await sandbox.app.resolve(CoreCryptoValidation).register();
	await sandbox.app.resolve(CoreCryptoAddressKeccak256).register();
	await sandbox.app.resolve(CoreCryptoKeyPairEcdsa).register();
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
	await sandbox.app.resolve(CoreEvmCallTransaction).register();
	await sandbox.app.resolve(CoreCryptoBlock).register();
	await sandbox.app.resolve(CoreCryptoMessages).register();
	await sandbox.app.resolve(CoreCryptoCommit).register();
	await sandbox.app.resolve(CoreSerializer).register();
	await sandbox.app.resolve(CoreCryptoWif).register();

	return sandbox.app;
};
