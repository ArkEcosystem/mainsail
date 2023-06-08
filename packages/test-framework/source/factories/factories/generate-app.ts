import { Contracts, Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";

import { ServiceProvider as CoreCryptoAddressBech32m } from "../../../../crypto-address-bech32m";
import { ServiceProvider as CoreCryptoBlock } from "../../../../crypto-block";
import { ServiceProvider as CoreCryptoHashBcrypto } from "../../../../crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "../../../../crypto-key-pair-schnorr";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "../../../../crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoConsensus } from "../../../../crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoTransaction } from "../../../../crypto-transaction";
import { ServiceProvider as CoreMultiPaymentTransaction } from "../../../../crypto-transaction-multi-payment";
import { ServiceProvider as CoreMultiSignatureRegistrationTransaction } from "../../../../crypto-transaction-multi-signature-registration";
import { ServiceProvider as CoreTransferTransaction } from "../../../../crypto-transaction-transfer";
import { ServiceProvider as CoreValidatorRegistrationTransaction } from "../../../../crypto-transaction-validator-registration";
import { ServiceProvider as CoreValidatorResignationTransaction } from "../../../../crypto-transaction-validator-resignation";
import { ServiceProvider as CoreVoteTransaction } from "../../../../crypto-transaction-vote";
import { ServiceProvider as CoreFees } from "../../../../fees";
import { ServiceProvider as CoreFeesStatic } from "../../../../fees-static";
import { ServiceProvider as CoreCryptoValidation } from "../../../../crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "../../../../crypto-wif";
import { ServiceProvider as CoreSerializer } from "../../../../serializer";
import { ServiceProvider as CoreValidation } from "../../../../validation";
import { Sandbox } from "../../app/sandbox";

export const generateApp = async (
	config: Contracts.Crypto.NetworkConfigPartial,
): Promise<Contracts.Kernel.Application> => {
	const sandbox = new Sandbox();

	sandbox.app.bind(Identifiers.EventDispatcherService).toConstantValue({});

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
	await sandbox.app.resolve(CoreSerializer).register();
	await sandbox.app.resolve(CoreCryptoWif).register();

	return sandbox.app;
};
