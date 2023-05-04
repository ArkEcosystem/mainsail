import { Contracts, Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";

import { ServiceProvider as CoreCryptoValidation } from "../../../../crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "../../../../crypto-wif";
import { ServiceProvider as CoreSerializer } from "../../../../core-serializer";
import { ServiceProvider as CoreValidation } from "../../../../core-validation";
import { ServiceProvider as CoreCryptoAddressBech32m } from "../../../../crypto-address-bech32";
import { ServiceProvider as CoreCryptoBlock } from "../../../../crypto-block";
import { ServiceProvider as CoreCryptoHashBcrypto } from "../../../../crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "../../../../crypto-key-pair-schnorr";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "../../../../crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTransaction, TransactionRegistry } from "../../../../crypto-transaction";
import { MultiPaymentTransaction } from "../../../../crypto-transaction-multi-payment";
import { MultiSignatureRegistrationTransaction } from "../../../../crypto-transaction-multi-signature-registration";
import { TransferTransaction } from "../../../../crypto-transaction-transfer";
import { ValidatorRegistrationTransaction } from "../../../../crypto-transaction-validator-registration";
import { ValidatorResignationTransaction } from "../../../../crypto-transaction-validator-resignation";
import { VoteTransaction } from "../../../../crypto-transaction-vote";
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
	await sandbox.app.resolve(CoreCryptoTransaction).register();
	await sandbox.app.resolve(CoreCryptoBlock).register();
	await sandbox.app.resolve(CoreSerializer).register();
	await sandbox.app.resolve(CoreCryptoWif).register();

	sandbox.app
		.get<TransactionRegistry>(Identifiers.Cryptography.Transaction.Registry)
		.registerTransactionType(TransferTransaction);
	sandbox.app
		.get<TransactionRegistry>(Identifiers.Cryptography.Transaction.Registry)
		.registerTransactionType(ValidatorRegistrationTransaction);
	sandbox.app
		.get<TransactionRegistry>(Identifiers.Cryptography.Transaction.Registry)
		.registerTransactionType(ValidatorResignationTransaction);
	sandbox.app
		.get<TransactionRegistry>(Identifiers.Cryptography.Transaction.Registry)
		.registerTransactionType(VoteTransaction);
	sandbox.app
		.get<TransactionRegistry>(Identifiers.Cryptography.Transaction.Registry)
		.registerTransactionType(MultiSignatureRegistrationTransaction);
	sandbox.app
		.get<TransactionRegistry>(Identifiers.Cryptography.Transaction.Registry)
		.registerTransactionType(MultiPaymentTransaction);

	return sandbox.app;
};
