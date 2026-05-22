import type { Contracts } from "@mainsail/contracts";

import { ServiceProvider as BlockchainUtilities } from "@mainsail/blockchain-utils";
import { Identifiers } from "@mainsail/constants";
import { ServiceProvider as CoreCryptoAddressBase58 } from "@mainsail/crypto-address-base58";
import { ServiceProvider as CoreCryptoAddressKeccak256 } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as CoreCryptoBlock } from "@mainsail/crypto-block";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairBls } from "@mainsail/crypto-key-pair-bls12-381";
import { ServiceProvider as CoreCryptoKeyPairEcdsa } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as CoreCryptoMessages } from "@mainsail/crypto-messages";
import { ServiceProvider as CoreCryptoProposal } from "@mainsail/crypto-proposal";
import { ServiceProvider as CoreCryptoSignatureBls } from "@mainsail/crypto-signature-bls12-381";
import { ServiceProvider as CoreCryptoSignatureEcdsa } from "@mainsail/crypto-signature-ecdsa";
import { ServiceProvider as CoreCryptoTransaction } from "@mainsail/crypto-transaction";
import { ServiceProvider as CoreCryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@mainsail/crypto-wif";
import { Identifiers as EvmConsensusIdentifiers } from "@mainsail/evm-consensus";
import { ServiceProvider as Forger } from "@mainsail/forger";
import { Application } from "@mainsail/kernel";
import { ServiceProvider as CoreSerializer } from "@mainsail/serializer";
import { ServiceProvider as CoreTransactions } from "@mainsail/transactions";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";

import crypto from "../../../core/bin/config/devnet/core/crypto.json" with { type: "json" };
import { ServiceProvider as CoreEvents } from "../../../kernel/source/services/events/index.js";
import { ServiceProvider as CoreTriggers } from "../../../kernel/source/services/triggers/index.js";

export const prepareSandbox = async (context: { app?: Application }): Promise<void> => {
	context.app = new Application();
	context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", crypto);
	await context.app.resolve(CoreValidation).register();
	await context.app.resolve(CryptoConfigServiceProvider).register();
	context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setHeight(1);

	await context.app.resolve(CoreTriggers).register();
	await context.app.resolve(CoreEvents).register();

	await context.app.resolve(CoreSerializer).register();
	await context.app.resolve(BlockchainUtilities).register();

	await context.app.resolve(CoreCryptoHashBcrypto).register();
	await context.app.resolve(CoreCryptoSignatureEcdsa).register();
	await context.app.resolve(CoreCryptoKeyPairEcdsa).register();

	await context.app.resolve(CoreCryptoAddressKeccak256).register();
	await context.app.resolve(CoreCryptoAddressBase58).register();
	await context.app.resolve(CoreCryptoValidation).register();
	await context.app.resolve(CoreCryptoWif).register();
	await context.app.resolve(CoreCryptoSignatureBls).register();
	await context.app.resolve(CoreCryptoKeyPairBls).register();

	context.app.bind(Identifiers.Services.Log.Service).toConstantValue({});
	context.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({ getRequired: () => 0.75 }); // txCollatorFactor

	await context.app.resolve(CoreCryptoTransaction).register();
	await context.app.resolve(CoreTransactions).register();
	await context.app.resolve(CoreCryptoBlock).register();
	await context.app.resolve(CoreCryptoProposal).register();
	await context.app.resolve(CoreCryptoMessages).register();
	await context.app.resolve(Forger).register();

	const workerPool = {
		getWorker: () => ({
			consensusSignature: (method, message, privateKey) =>
				context
					.app!.getTagged(Identifiers.Cryptography.Signature.Instance, "type", "consensus")!
					[method](message, privateKey),
		}),
	};
	context.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue(workerPool);

	context.app.bind(Identifiers.TransactionPool.Worker).toConstantValue({
		getTransactions: async () => ({
			remaining: 0,
			transactions: [],
		}),
	});

	const validator = {
		getEvm: () => ({
			dispose: async () => {},
			initializeGenesis: async () => {},
			logsBloom: async () => "0".repeat(512),
			prepareNextCommit: async () => {},
			rollback: async () => {},
			snapshot: async () => {},
			stateRoot: async () => "0000000000000000000000000000000000000000000000000000000000000000",
			updateRewardsAndVotes: async () => {},
		}),
		validate: async () => true,
	};
	context.app.rebind(Identifiers.Transaction.Validator.Factory).toConstantValue(() => validator);

	context.app.bind(Identifiers.Evm.Instance).toConstantValue(() => {});
	context.app.bind(EvmConsensusIdentifiers.Internal.GenesisInfo).toConstantValue({});

	context.app.bind(Identifiers.State.Store).toConstantValue({
		getGenesisCommit: () => ({
			block: {
				hash: "0000000000000000000000000000000000000000000000000000000000000001",
			},
		}),
		getLastBlock: () => ({
			hash: "0000000000000000000000000000000000000000000000000000000000000000",
			logsBloom: "0".repeat(512),
			number: 1,
			parentHash: "0000000000000000000000000000000000000000000000000000000000000000",
			stateRoot: "0000000000000000000000000000000000000000000000000000000000000000",
		}),
	});

	context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue({
		getValidatorIndexByWalletPublicKey: () => 0,
	});
};
