import { ServiceProvider as BlockchainUtils } from "@mainsail/blockchain-utils";
import { Identifiers } from "@mainsail/contracts";
import { ServiceProvider as CoreCryptoAddressBase58 } from "@mainsail/crypto-address-base58";
import { ServiceProvider as CoreCryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CoreCryptoBlock } from "@mainsail/crypto-block";
import { Configuration } from "@mainsail/crypto-config";
import { ServiceProvider as CoreConsensusBls12381 } from "@mainsail/crypto-consensus-bls12-381";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "@mainsail/crypto-key-pair-schnorr";
import { ServiceProvider as CoreCryptoMessages } from "@mainsail/crypto-messages";
import { ServiceProvider as CoreCryptoSignatureEcdsa } from "@mainsail/crypto-signature-ecdsa";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/crypto-wif";
import { Identifiers as EvmConsensusIdentifiers } from "@mainsail/evm-consensus";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";
import { ServiceProvider as CoreTransactions } from "@mainsail/transactions";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";

import crypto from "../../../core/bin/config/devnet/core/crypto.json";
import { ServiceProvider as CoreEvents } from "../../../kernel/source/services/events";
import { ServiceProvider as CoreTriggers } from "../../../kernel/source/services/triggers";
import { Sandbox } from "../../../test-framework/source";

export const prepareSandbox = async (context: { sandbox?: Sandbox }) => {
	context.sandbox = new Sandbox();

	context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
	context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(crypto);
	context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setHeight(1);

	await context.sandbox.app.resolve(CoreTriggers).register();
	await context.sandbox.app.resolve(CoreEvents).register();

	await context.sandbox.app.resolve(CoreSerializer).register();
	await context.sandbox.app.resolve(CoreValidation).register();
	await context.sandbox.app.resolve(BlockchainUtils).register();

	await context.sandbox.app.resolve(CoreCryptoHashBcrypto).register();
	await context.sandbox.app.resolve(CoreCryptoSignatureEcdsa).register();
	await context.sandbox.app.resolve(CoreCryptoKeyPairSchnorr).register();

	await context.sandbox.app.resolve(CoreCryptoAddressKeccak256).register();
	await context.sandbox.app.resolve(CoreCryptoAddressBase58).register();
	await context.sandbox.app.resolve(CoreCryptoValidation).register();
	await context.sandbox.app.resolve(CoreCryptoWif).register();
	await context.sandbox.app.resolve(CoreConsensusBls12381).register();

	context.sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue({});
	context.sandbox.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({ getRequired: () => 0.75 }); // txCollatorFactor

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

	context.sandbox.app.bind(Identifiers.TransactionPool.Worker).toConstantValue({
		getTransactionBytes: async () => [],
	});

	const validator = {
		getEvm: () => ({
			dispose: async () => {},
			initializeGenesis: async () => {},
			logsBloom: async () => "0".repeat(512),
			prepareNextCommit: async () => {},
			stateRoot: async () => "0000000000000000000000000000000000000000000000000000000000000000",
			updateRewardsAndVotes: async () => {},
			snapshot: async () => {},
			rollback: async () => {},
		}),
		validate: async () => true,
	};
	context.sandbox.app.rebind(Identifiers.Transaction.Validator.Factory).toConstantValue(() => validator);

	context.sandbox.app.bind(Identifiers.Evm.Instance).toConstantValue(() => {});
	context.sandbox.app.bind(EvmConsensusIdentifiers.Internal.GenesisInfo).toConstantValue({});

	context.sandbox.app.bind(Identifiers.State.Store).toConstantValue({
		getLastBlock: () => ({
			header: {
				number: 1,
				hash: "0000000000000000000000000000000000000000000000000000000000000000",
				logsBloom: "0".repeat(512),
				parentHash: "0000000000000000000000000000000000000000000000000000000000000000",
				stateRoot: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		}),
	});

	context.sandbox.app.bind(Identifiers.ValidatorSet.Service).toConstantValue({
		getValidatorIndexByWalletPublicKey: () => 0,
	});
};
