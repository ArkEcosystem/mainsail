import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services } from "@mainsail/kernel";

import crypto from "../../../core/bin/config/testnet/crypto.json";
import { ServiceProvider as CoreCryptoAddressBech32m } from "../../../crypto-address-bech32m";
import { ServiceProvider as CoreCryptoBlock } from "../../../crypto-block";
import { ServiceProvider as CoreCryptoConfig } from "../../../crypto-config";
import { ServiceProvider as CoreConsensusBls12381 } from "../../../crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "../../../crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "../../../crypto-key-pair-schnorr";
import { ServiceProvider as CoreCryptoMessages } from "../../../crypto-messages";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "../../../crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTransaction } from "../../../crypto-transaction";
import { ServiceProvider as CoreCryptoWif } from "../../../crypto-wif";
import { ServiceProvider as CoreCryptoValidation } from "../../../crypto-validation";
import { ServiceProvider as CoreEvents } from "../../../kernel/source/services/events";
import { ServiceProvider as CoreTriggers } from "../../../kernel/source/services/triggers";
import { ServiceProvider as CoreSerializer } from "../../../serializer";
import { ServiceProvider as CoreState } from "../../../state";
import { Sandbox } from "../../../test-framework";
import { ServiceProvider as CoreTransactions } from "../../../transactions";
import { ServiceProvider as CoreValidation } from "../../../validation";

export const prepareSandbox = async (context: { sandbox?: Sandbox }) => {
	context.sandbox = new Sandbox();

	await context.sandbox.app.resolve(CoreTriggers).register();
	await context.sandbox.app.resolve(CoreEvents).register();

	await context.sandbox.app.resolve(CoreSerializer).register();
	await context.sandbox.app.resolve(CoreValidation).register();
	await context.sandbox.app.resolve(CoreCryptoConfig).register();

	await context.sandbox.app.resolve(CoreCryptoHashBcrypto).register();

	await context.sandbox.app.resolve(CoreCryptoSignatureSchnorr).register();
	await context.sandbox.app.resolve(CoreCryptoKeyPairSchnorr).register();

	await context.sandbox.app.resolve(CoreCryptoAddressBech32m).register();
	await context.sandbox.app.resolve(CoreCryptoValidation).register();
	await context.sandbox.app.resolve(CoreCryptoWif).register();
	await context.sandbox.app.resolve(CoreConsensusBls12381).register();
	await context.sandbox.app.resolve(CoreState).register();
	await context.sandbox.app.resolve(CoreCryptoTransaction).register();
	await context.sandbox.app.resolve(CoreTransactions).register();
	await context.sandbox.app.resolve(CoreCryptoBlock).register();
	await context.sandbox.app.resolve(CoreCryptoMessages).register();

	context.sandbox.app.bind(Identifiers.LogService).toConstantValue({});
	context.sandbox.app.bind(Identifiers.TransactionPoolCollator).toConstantValue({
		getBlockCandidateTransactions: () => [],
	});
	context.sandbox.app.bind(Identifiers.TransactionPoolService).toConstantValue({});
	context.sandbox.app.bind(Identifiers.Database.Service).toConstantValue({
		getLastBlock: () => ({
			data: {
				height: 1,
				id: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		}),
	});

	context.sandbox.app.bind(Identifiers.ValidatorSet).toConstantValue({
		getValidatorIndexByWalletPublicKey: () => 0,
	});

	context.sandbox.app
		.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes)
		.set("validatorConsensusPublicKey");
	context.sandbox.app.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration).setConfig(crypto);
};
