import { Contracts, Identifiers } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressBech32m } from "@mainsail/crypto-address-bech32m";
import { ServiceProvider as CoreCryptoBlock } from "@mainsail/crypto-block";
import { ServiceProvider as CoreCryptoConfig } from "@mainsail/crypto-config";
import { ServiceProvider as CoreConsensusBls12381 } from "@mainsail/crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "@mainsail/crypto-key-pair-schnorr";
import { ServiceProvider as CoreCryptoMessages } from "@mainsail/crypto-messages";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "@mainsail/crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/crypto-wif";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";

import crypto from "../../../core/bin/config/testnet/core/crypto.json";
import { ServiceProvider as CoreEvents } from "../../../kernel/source/services/events";
import { ServiceProvider as CoreTriggers } from "../../../kernel/source/services/triggers";
import { Sandbox } from "../../../test-framework/source";
import { ServiceProvider as CoreTransactions } from "@mainsail/transactions";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";

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

	context.sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue({});
	context.sandbox.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setConfig(crypto);

	await context.sandbox.app.resolve(CoreCryptoTransaction).register();
	await context.sandbox.app.resolve(CoreTransactions).register();
	await context.sandbox.app.resolve(CoreCryptoBlock).register();
	await context.sandbox.app.resolve(CoreCryptoMessages).register();

	const workerPool = {
		getWorker: () => ({
			// @ts-ignore
			consensusSignature: (method, message, privateKey) =>
				context.sandbox.app
					.getTagged(Identifiers.Cryptography.Signature.Instance, "type", "consensus")!
					[method](message, privateKey),
		}),
	};
	context.sandbox.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue(workerPool);

	context.sandbox.app.bind(Identifiers.TransactionPool.Collator).toConstantValue({
		getBlockCandidateTransactions: () => [],
	});
	context.sandbox.app.bind(Identifiers.TransactionPool.Service).toConstantValue({});

	context.sandbox.app.bind(Identifiers.State.Service).toConstantValue({
		getStore: () => ({
			getLastBlock: () => ({
				data: {
					height: 1,
					id: "0000000000000000000000000000000000000000000000000000000000000000",
				},
			}),
		}),
	});

	context.sandbox.app.bind(Identifiers.ValidatorSet.Service).toConstantValue({
		getValidatorIndexByWalletPublicKey: () => 0,
	});
};
