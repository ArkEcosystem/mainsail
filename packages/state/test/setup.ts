import { injectable, Selectors } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Services } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";
import { SinonSpy, spy } from "sinon";

import cryptoJson from "../../core/bin/config/testnet/crypto.json";
import { AddressFactory } from "../../crypto-address-base58/source/address.factory";
import { Configuration } from "../../crypto-config";
import { HashFactory } from "../../crypto-hash-bcrypto/source/hash.factory";
import { KeyPairFactory } from "../../crypto-key-pair-schnorr/source/pair";
import { PublicKeyFactory } from "../../crypto-key-pair-schnorr/source/public";
import { PublicKeySerializer } from "../../crypto-key-pair-schnorr/source/serializer";
import { Signature } from "../../crypto-signature-schnorr/source/signature";
import {
	Deserializer as TransactionDeserializer,
	Serializer,
	TransactionFactory,
	TransactionRegistry,
	TransactionTypeFactory,
	Utils,
	Verifier,
} from "../../crypto-transaction";
import { Factories, Sandbox } from "../../test-framework";
import { Validator } from "../../validation/source/validator";
import { StateBuilder } from "../source";
import { BlockState } from "../source/block-state";
import { defaults } from "../source/defaults";
import { StateStore } from "../source/stores";
import { TransactionValidator } from "../source/transaction-validator";
import {
	registerIndexers,
	WalletRepository,
	WalletRepositoryClone,
	WalletRepositoryCopyOnWrite,
} from "../source/wallets";
import { walletFactory } from "../source/wallets/wallet-factory";

export interface Spies {
	applySpy: SinonSpy;
	revertSpy: SinonSpy;
	logger: {
		error: SinonSpy;
		info: SinonSpy;
		notice: SinonSpy;
		debug: SinonSpy;
		warning: SinonSpy;
	};
	getBlockRewardsSpy: SinonSpy;
	getSentTransactionSpy: SinonSpy;
	getRegisteredHandlersSpy: SinonSpy;
	dispatchSpy: SinonSpy;
	dispatchSyncSpy: SinonSpy;
}

export interface Setup {
	sandbox: Sandbox;
	walletRepo: WalletRepository;
	walletRepoClone: WalletRepositoryClone;
	walletRepoCopyOnWrite: WalletRepositoryCopyOnWrite;
	factory: Factories.FactoryBuilder;
	blockState: BlockState;
	stateStore: StateStore;
	stateBuilder: StateBuilder;
	transactionValidator: TransactionValidator;
	spies: Spies;
}

export const setUpDefaults = {
	getBlockRewards: [
		{
			generatorPublicKey: "03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
			rewards: BigNumber.make(10_000),
		},
	],
	getRegisteredHandlers: [],
	getSentTransaction: [
		{
			amount: BigNumber.make(22_222),
			fee: BigNumber.make(33_333),
			nonce: BigNumber.ONE,
			senderPublicKey: "03720586a26d8d49ec27059bd4572c49ba474029c3627715380f4df83fb431aece",
		},
	],
};

export const setUp = async (setUpOptions = setUpDefaults, skipBoot = false): Promise<Setup> => {
	const sandbox = new Sandbox();

	const logger = {
		debug: spy(),
		error: spy(),
		info: spy(),
		notice: spy(),
		warning: spy(),
	};

	sandbox.app.bind(Identifiers.LogService).toConstantValue(logger);
	sandbox.app.bind(Identifiers.WalletAttributes).to(Services.Attributes.AttributeSet).inSingletonScope();
	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator");
	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator.username");
	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator.voteBalance");
	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator.producedBlocks");
	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator.forgedTotal");
	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator.approval");
	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("vote");
	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator.resigned");
	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator.rank");
	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("validator.round");

	registerIndexers(sandbox.app);

	sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

	sandbox.app.bind(Identifiers.PluginConfiguration).to(Providers.PluginConfiguration).inSingletonScope();
	sandbox.app
		.get<Providers.PluginConfiguration>(Identifiers.PluginConfiguration)
		.set("storage.maxLastBlocks", defaults.storage.maxLastBlocks);
	sandbox.app
		.get<Providers.PluginConfiguration>(Identifiers.PluginConfiguration)
		.set("storage.maxLastTransactionIds", defaults.storage.maxLastTransactionIds);
	sandbox.app.bind(Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();

	sandbox.app.bind(Identifiers.StateStore).to(StateStore).inSingletonScope();

	sandbox.app.bind(Identifiers.Cryptography.Identity.AddressFactory).to(AddressFactory).inSingletonScope();
	sandbox.app.bind(Identifiers.Cryptography.Identity.PublicKeyFactory).to(PublicKeyFactory).inSingletonScope();
	sandbox.app.bind(Identifiers.Cryptography.Identity.KeyPairFactory).to(KeyPairFactory).inSingletonScope();
	sandbox.app.bind(Identifiers.Cryptography.Identity.PublicKeySerializer).to(PublicKeySerializer).inSingletonScope();

	sandbox.app.bind(Identifiers.Cryptography.Transaction.Registry).to(TransactionRegistry);
	sandbox.app.bind(Identifiers.Cryptography.Validator).to(Validator);
	sandbox.app.bind(Identifiers.Cryptography.Transaction.TypeFactory).to(TransactionTypeFactory);
	sandbox.app.bind(Identifiers.Cryptography.Transaction.Verifier).to(Verifier);
	sandbox.app.bind(Identifiers.Cryptography.Signature).to(Signature);
	sandbox.app.bind(Identifiers.Cryptography.Transaction.Utils).to(Utils);
	sandbox.app.bind(Identifiers.Cryptography.Transaction.Serializer).to(Serializer);
	sandbox.app.bind(Identifiers.Cryptography.HashFactory).to(HashFactory);
	sandbox.app.bind(Identifiers.Cryptography.Transaction.Factory).to(TransactionFactory);
	sandbox.app.bind(Identifiers.Database.BlockStorage).toConstantValue({
		deleteBlocks: () => {},
		deleteTopBlocks: () => {},
		saveBlocks: () => {},
	});

	const stateStore: StateStore = sandbox.app.get(Identifiers.StateStore);

	const applySpy: SinonSpy = spy();
	const revertSpy: SinonSpy = spy();

	const getRegisteredHandlersSpy = spy();

	@injectable()
	class MockHandler {
		public getActivatedHandlerForData() {
			return {
				apply: applySpy,
				revert: revertSpy,
			};
		}

		public getRegisteredHandlers() {
			getRegisteredHandlersSpy();
			return setUpOptions.getRegisteredHandlers;
		}
	}

	sandbox.app.bind(Identifiers.TransactionHandlerRegistry).to(MockHandler);

	const getBlockRewardsSpy = spy();

	// @injectable()
	// class MockBlockRepository {
	// 	public getBlockRewards() {
	// 		getBlockRewardsSpy();
	// 		return setUpOptions.getBlockRewards;
	// 	}
	// }

	const getSentTransactionSpy = spy();

	// @injectable()
	// class MockTransactionRepository {
	// 	public getSentTransactions() {
	// 		getSentTransactionSpy();
	// 		return setUpOptions.getSentTransaction;
	// 	}
	// }

	const dispatchSpy = spy();
	const dispatchSyncSpy = spy();

	@injectable()
	class MockEventDispatcher {
		public dispatch(data) {
			return dispatchSpy(data);
		}

		public dispatchSync(...data) {
			return dispatchSyncSpy(...data);
		}
	}

	// sandbox.app.container.bind(Identifiers.DatabaseBlockRepository).to(MockBlockRepository);
	// sandbox.app.container.bind(Identifiers.DatabaseTransactionRepository).to(MockTransactionRepository);
	sandbox.app.container.bind(Identifiers.EventDispatcherService).to(MockEventDispatcher);

	sandbox.app
		.bind(Identifiers.WalletRepository)
		.to(WalletRepository)
		.inSingletonScope()
		.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "blockchain"));

	sandbox.app
		.bind(Identifiers.WalletFactory)
		.toFactory(({ container }) =>
			walletFactory(
				container.get(Identifiers.WalletAttributes),
				container.get(Identifiers.EventDispatcherService),
			),
		)
		.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "blockchain"));

	sandbox.app
		.bind(Identifiers.WalletRepository)
		.to(WalletRepositoryClone)
		.inRequestScope()
		.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "clone"));

	sandbox.app
		.bind(Identifiers.WalletFactory)
		.toFactory(({ container }) => walletFactory(container.get(Identifiers.WalletAttributes)))
		.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "clone"));

	sandbox.app
		.bind(Identifiers.WalletRepository)
		.to(WalletRepositoryCopyOnWrite)
		.inRequestScope()
		.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "copy-on-write"));

	sandbox.app
		.bind(Identifiers.WalletFactory)
		.toFactory(({ container }) => walletFactory(container.get(Identifiers.WalletAttributes)))
		.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "copy-on-write"));

	const walletRepoClone: WalletRepositoryClone = sandbox.app.getTagged(
		Identifiers.WalletRepository,
		"state",
		"clone",
	);

	const walletRepo: WalletRepository = sandbox.app.getTagged(Identifiers.WalletRepository, "state", "blockchain");

	const walletRepoCopyOnWrite: WalletRepositoryCopyOnWrite = sandbox.app.getTagged(
		Identifiers.WalletRepository,
		"state",
		"copy-on-write",
	);

	sandbox.app.bind(Identifiers.BlockState).to(BlockState);

	sandbox.app.bind(Identifiers.Cryptography.Transaction.Deserializer).to(TransactionDeserializer).inSingletonScope();
	// sandbox.app.bind(Identifiers.Cryptography.Block.Serializer).to(Serializer).inSingletonScope();
	const blockFactory = {
		fromData: () => {},
	};

	sandbox.app.bind(Identifiers.Cryptography.Block.Factory).toConstantValue(blockFactory);

	@injectable()
	class MockValidatorMutator implements Contracts.State.ValidatorMutator {
		public apply = spy();
		public revert = spy();
	}

	sandbox.app.bind(Identifiers.State.ValidatorMutator).to(MockValidatorMutator).inSingletonScope();

	const blockState = sandbox.app.get<BlockState>(Identifiers.BlockState);

	sandbox.app.bind(Identifiers.TransactionValidator).to(TransactionValidator);

	const transactionValidator = sandbox.app.get<TransactionValidator>(Identifiers.TransactionValidator);

	const stateBuilder = sandbox.app.resolve<StateBuilder>(StateBuilder);

	if (!skipBoot) {
		try {
			await sandbox.boot();
		} catch (error) {
			console.error(error);
			throw error;
		}

		// todo: get rid of the need for this, requires an instance based crypto package

		// sandbox.app
		// 	.get<Configuration>(Identifiers.Cryptography.Configuration)
		// 	.setConfig(sandbox.app.get<Services.Config.ConfigRepository>(Identifiers.ConfigRepository).get("crypto"));
		sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);
	}

	const factory = new Factories.FactoryBuilder();

	await Factories.Factories.registerBlockFactory(factory);
	await Factories.Factories.registerTransactionFactory(factory);
	await Factories.Factories.registerWalletFactory(factory);

	return {
		blockState,
		factory,
		sandbox,
		spies: {
			applySpy,
			dispatchSpy,
			dispatchSyncSpy,
			getBlockRewardsSpy,
			getRegisteredHandlersSpy,
			getSentTransactionSpy,
			logger,
			revertSpy,
		},
		stateBuilder,
		stateStore,
		transactionValidator,
		walletRepo,
		walletRepoClone,
		walletRepoCopyOnWrite,
	};
};
