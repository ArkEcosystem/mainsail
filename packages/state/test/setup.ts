import { injectable, Selectors } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Services } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";
import { SinonSpy, spy } from "sinon";

import cryptoJson from "../../core/bin/config/testnet/mainsail/crypto.json";
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
import { Selector } from "../../proposer/source/selector";
import { Factories, Sandbox } from "../../test-framework";
import { Validator } from "../../validation/source/validator";
import { AttributeRepository } from "../source/attributes";
import { store } from "../source/state-store";
import { IndexSet, WalletRepository, WalletRepositoryClone, WalletRepositoryCopyOnWrite } from "../source/wallets";
import { walletFactory } from "../source/wallets/factory";

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
	app: Contracts.Kernel.Application;
	sandbox: Sandbox;
	walletRepo: WalletRepository;
	walletRepoCopyOnWrite: WalletRepositoryCopyOnWrite;
	factory: Factories.FactoryBuilder;
	store: store;
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

	sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue(logger);

	sandbox.app.bind(Identifiers.State.WalletRepository.IndexSet).to(IndexSet).inSingletonScope();
	sandbox.app
		.get<Contracts.State.IndexSet>(Identifiers.State.WalletRepository.IndexSet)
		.set(Contracts.State.WalletIndexes.Addresses);
	sandbox.app
		.get<Contracts.State.IndexSet>(Identifiers.State.WalletRepository.IndexSet)
		.set(Contracts.State.WalletIndexes.PublicKeys);
	sandbox.app
		.get<Contracts.State.IndexSet>(Identifiers.State.WalletRepository.IndexSet)
		.set(Contracts.State.WalletIndexes.Usernames);
	sandbox.app
		.get<Contracts.State.IndexSet>(Identifiers.State.WalletRepository.IndexSet)
		.set(Contracts.State.WalletIndexes.Resignations);

	sandbox.app.bind(Identifiers.State.AttributeRepository).to(AttributeRepository).inSingletonScope();
	sandbox.app
		.get<Contracts.State.IAttributeRepository>(Identifiers.State.AttributeRepository)
		.set("height", Contracts.State.AttributeType.Number);
	sandbox.app
		.get<Contracts.State.IAttributeRepository>(Identifiers.State.AttributeRepository)
		.set("totalRound", Contracts.State.AttributeType.Number);

	sandbox.app.bind(Identifiers.State.Wallet.Attributes).to(AttributeRepository).inSingletonScope();
	sandbox.app
		.get<Contracts.State.IAttributeRepository>(Identifiers.State.Wallet.Attributes)
		.set("nonce", Contracts.State.AttributeType.BigNumber);
	sandbox.app
		.get<Contracts.State.IAttributeRepository>(Identifiers.State.Wallet.Attributes)
		.set("balance", Contracts.State.AttributeType.BigNumber);
	sandbox.app
		.get<Contracts.State.IAttributeRepository>(Identifiers.State.Wallet.Attributes)
		.set("publicKey", Contracts.State.AttributeType.String);
	sandbox.app
		.get<Contracts.State.IAttributeRepository>(Identifiers.State.Wallet.Attributes)
		.set("validatorVoteBalance", Contracts.State.AttributeType.BigNumber);
	sandbox.app
		.get<Contracts.State.IAttributeRepository>(Identifiers.State.Wallet.Attributes)
		.set("validatorProducedBlocks", Contracts.State.AttributeType.Number);
	sandbox.app
		.get<Contracts.State.IAttributeRepository>(Identifiers.State.Wallet.Attributes)
		.set("validatorForgedTotal", Contracts.State.AttributeType.BigNumber);
	sandbox.app
		.get<Contracts.State.IAttributeRepository>(Identifiers.State.Wallet.Attributes)
		.set("validatorForgedFees", Contracts.State.AttributeType.BigNumber);
	sandbox.app
		.get<Contracts.State.IAttributeRepository>(Identifiers.State.Wallet.Attributes)
		.set("validatorForgedRewards", Contracts.State.AttributeType.BigNumber);
	sandbox.app
		.get<Contracts.State.IAttributeRepository>(Identifiers.State.Wallet.Attributes)
		.set("validatorApproval", Contracts.State.AttributeType.Number);
	sandbox.app
		.get<Contracts.State.IAttributeRepository>(Identifiers.State.Wallet.Attributes)
		.set("vote", Contracts.State.AttributeType.String);
	sandbox.app
		.get<Contracts.State.IAttributeRepository>(Identifiers.State.Wallet.Attributes)
		.set("validatorResigned", Contracts.State.AttributeType.Boolean);
	sandbox.app
		.get<Contracts.State.IAttributeRepository>(Identifiers.State.Wallet.Attributes)
		.set("validatorRank", Contracts.State.AttributeType.Number);

	sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

	sandbox.app.bind(Identifiers.ServiceProvider.Configuration).to(Providers.PluginConfiguration).inSingletonScope();
	sandbox.app.bind(Identifiers.Services.Trigger.Service).to(Services.Triggers.Triggers).inSingletonScope();

	sandbox.app.bind(Identifiers.store).to(store).inSingletonScope();

	sandbox.app.bind(Identifiers.Cryptography.Identity.Address.Factory).to(AddressFactory).inSingletonScope();
	sandbox.app.bind(Identifiers.Cryptography.Identity.PublicKey.Factory).to(PublicKeyFactory).inSingletonScope();
	sandbox.app.bind(Identifiers.Cryptography.Identity.KeyPair.Factory).to(KeyPairFactory).inSingletonScope();
	sandbox.app.bind(Identifiers.Cryptography.Identity.PublicKey.Serializer).to(PublicKeySerializer).inSingletonScope();

	sandbox.app.bind(Identifiers.Cryptography.Transaction.Registry).to(TransactionRegistry);
	sandbox.app.bind(Identifiers.Cryptography.Validator).to(Validator);
	sandbox.app.bind(Identifiers.Cryptography.Transaction.TypeFactory).to(TransactionTypeFactory);
	sandbox.app.bind(Identifiers.Cryptography.Transaction.Verifier).to(Verifier);
	sandbox.app.bind(Identifiers.Cryptography.Signature.Instance).to(Signature);
	sandbox.app.bind(Identifiers.Cryptography.Transaction.Utils).to(Utils);
	sandbox.app.bind(Identifiers.Cryptography.Transaction.Serializer).to(Serializer);
	sandbox.app.bind(Identifiers.Cryptography.Hash.Factory).to(HashFactory);
	sandbox.app.bind(Identifiers.Cryptography.Transaction.Factory).to(TransactionFactory);
	sandbox.app.bind(Identifiers.Database.Storage.Block).toConstantValue({
		deleteBlocks: () => {},
		deleteTopBlocks: () => {},
		saveBlocks: () => {},
	});
	sandbox.app.bind(Identifiers.ValidatorSet.Service).toConstantValue({
		getActiveValidators: () => {},
		initialize: () => {},
	});
	sandbox.app.bind(Identifiers.Database.Service).toConstantValue({});

	const store: store = sandbox.app.get(Identifiers.store);

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

	sandbox.app.bind(Identifiers.Transaction.Handler.Registry).to(MockHandler);

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

	sandbox.app.container.bind(Identifiers.Services.EventDispatcher.Service).to(MockEventDispatcher);

	sandbox.app
		.bind(Identifiers.WalletRepository)
		.to(WalletRepository)
		.inSingletonScope()
		.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "blockchain"));

	sandbox.app
		.bind(Identifiers.State.Wallet.Factory)
		.toFactory(({ container }) => walletFactory(container.get(Identifiers.State.Wallet.Attributes)));

	sandbox.app
		.bind(Identifiers.WalletRepository)
		.to(WalletRepositoryCopyOnWrite)
		.inRequestScope()
		.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "copy-on-write"));

	sandbox.app.bind(Identifiers.State.WalletRepository.CopyOnWriteFactory).toFactory(
		({ container }) =>
			() =>
				container
					.resolve(WalletRepositoryClone)
					.configure(container.getTagged(Identifiers.WalletRepository, "state", "blockchain")),
	);

	const walletRepo: WalletRepository = sandbox.app.getTagged(Identifiers.WalletRepository, "state", "blockchain");

	const walletRepoCopyOnWrite: WalletRepositoryCopyOnWrite = sandbox.app.getTagged(
		Identifiers.WalletRepository,
		"state",
		"copy-on-write",
	);

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

	sandbox.app.bind(Identifiers.Proposer.Selector).to(Selector);

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
		// 	.setConfig(sandbox.app.get<Services.Config.ConfigRepository>(Identifiers.Config.Repository).get("crypto"));
		sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);
	}

	const factory = new Factories.FactoryBuilder();

	await Factories.Factories.registerBlockFactory(factory);
	await Factories.Factories.registerTransactionFactory(factory);

	return {
		app: sandbox.app,
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
		store,
		walletRepo,
		walletRepoCopyOnWrite,
	};
};
