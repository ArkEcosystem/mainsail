import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";

import { ServiceProvider as CoreCryptoAddressBech32m } from "../../../../core-crypto-address-bech32m";
import { ServiceProvider as CoreCryptoBlock } from "../../../../core-crypto-block";
import { ServiceProvider as CoreCryptoHashBcrypto } from "../../../../core-crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "../../../../core-crypto-key-pair-schnorr";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "../../../../core-crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTransaction, TransactionRegistry } from "../../../../core-crypto-transaction";
import { MultiPaymentTransaction } from "../../../../core-crypto-transaction-multi-payment";
import { MultiSignatureRegistrationTransaction } from "../../../../core-crypto-transaction-multi-signature-registration";
import { TransferTransaction } from "../../../../core-crypto-transaction-transfer";
import { ValidatorRegistrationTransaction } from "../../../../core-crypto-transaction-validator-registration";
import { ValidatorResignationTransaction } from "../../../../core-crypto-transaction-validator-resignation";
import { VoteTransaction } from "../../../../core-crypto-transaction-vote";
import { ServiceProvider as CoreCryptoWif } from "../../../../core-crypto-wif";
import { ServiceProvider as CoreSerializer } from "../../../../core-serializer";
import { ServiceProvider as CoreValidation } from "../../../../core-validation";
import { Sandbox } from "../../app/sandbox";

export const generateApp = async (
	config: Contracts.Crypto.NetworkConfigPartial,
): Promise<Contracts.Kernel.Application> => {
	const sandbox = new Sandbox();

	sandbox.app.bind(Identifiers.EventDispatcherService).toConstantValue({});

	sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
	sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(config);

	await sandbox.app.resolve(CoreCryptoAddressBech32m).register();
	await sandbox.app.resolve(CoreCryptoKeyPairSchnorr).register();
	await sandbox.app.resolve(CoreCryptoSignatureSchnorr).register();
	await sandbox.app.resolve(CoreCryptoHashBcrypto).register();
	await sandbox.app.resolve(CoreValidation).register();
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
