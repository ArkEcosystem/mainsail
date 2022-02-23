import { Application, Container, Contracts, Exceptions, Services } from "@arkecosystem/core-kernel";
import { Stores, Wallets } from "@arkecosystem/core-state";
import {
	describe,
	Factories,
	Generators,
	getWalletAttributeSet,
	Mocks,
	passphrases,
} from "@arkecosystem/core-test-framework";
import { Crypto, Enums, Identities, Interfaces, Managers, Transactions, Utils } from "@arkecosystem/crypto";

import { LegacyMultiSignatureError, MultiSignatureAlreadyRegisteredError } from "../../errors";
import { buildMultiSignatureWallet, buildRecipientWallet, buildSenderWallet, initApp } from "../../../test/app";
import { TransactionHandlerRegistry } from "../handler-registry";
import { TransactionHandler } from "../transaction";

describe<{
	app: Application;
	senderWallet: Wallets.Wallet;
	multiSignatureWallet: Wallets.Wallet;
	recipientWallet: Wallets.Wallet;
	walletRepository: Contracts.State.WalletRepository;
	handler: TransactionHandler;
	factoryBuilder: Factories.FactoryBuilder;
	multiSignatureTransaction: Interfaces.ITransaction;
	multiSignatureAsset: Interfaces.IMultiSignatureAsset;
	store: any;
	transactionHistoryService: any;
}>("MultiSignatureRegistrationTransaction", ({ assert, afterEach, beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		const mockLastBlockData: Partial<Interfaces.IBlockData> = { height: 4, timestamp: Crypto.Slots.getTime() };
		context.store = stub(Stores.StateStore.prototype, "getLastBlock").returnValue({ data: mockLastBlockData });

		context.transactionHistoryService = {
			streamByCriteria: async function* () {
				yield context.multiSignatureTransaction.data;
			},
		};

		Managers.configManager.setConfig(Generators.generateCryptoConfigRaw());
		Managers.configManager.getMilestone().aip11 = false;

		context.app = initApp();
		context.app
			.bind(Container.Identifiers.TransactionHistoryService)
			.toConstantValue(context.transactionHistoryService);

		context.walletRepository = context.app.get<Wallets.WalletRepository>(Container.Identifiers.WalletRepository);

		context.factoryBuilder = new Factories.FactoryBuilder();
		Factories.Factories.registerWalletFactory(context.factoryBuilder);
		Factories.Factories.registerTransactionFactory(context.factoryBuilder);

		context.senderWallet = buildSenderWallet(context.factoryBuilder);
		context.multiSignatureWallet = buildMultiSignatureWallet();
		context.recipientWallet = buildRecipientWallet(context.factoryBuilder);

		context.walletRepository.index(context.senderWallet);
		context.walletRepository.index(context.multiSignatureWallet);
		context.walletRepository.index(context.recipientWallet);

		const transactionHandlerRegistry: TransactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Container.Identifiers.TransactionHandlerRegistry,
		);
		context.handler = transactionHandlerRegistry.getRegisteredHandlerByType(
			Transactions.InternalTransactionType.from(
				Enums.TransactionType.MultiSignature,
				Enums.TransactionTypeGroup.Core,
			),
			1,
		);

		context.senderWallet.setBalance(Utils.BigNumber.make(100_390_000_000));

		context.multiSignatureAsset = {
			min: 2,
			publicKeys: [
				Identities.PublicKey.fromPassphrase(passphrases[0]),
				Identities.PublicKey.fromPassphrase(passphrases[1]),
				Identities.PublicKey.fromPassphrase(passphrases[2]),
			],
		};

		context.recipientWallet = new Wallets.Wallet(
			Identities.Address.fromMultiSignatureAsset(context.multiSignatureAsset),
			new Services.Attributes.AttributeMap(getWalletAttributeSet()),
		);

		context.walletRepository.index(context.recipientWallet);

		context.multiSignatureTransaction = Transactions.BuilderFactory.multiSignature()
			.version(1)
			.multiSignatureAsset(context.multiSignatureAsset)
			.senderPublicKey(Identities.PublicKey.fromPassphrase(passphrases[0]))
			.nonce("1")
			.recipientId(context.recipientWallet.getPublicKey()!)
			.multiSign(passphrases[0], 0) // ! implicitly sets version to 2
			.multiSign(passphrases[1], 1)
			.multiSign(passphrases[2], 2)
			.sign(passphrases[0])
			.build();

		context.multiSignatureTransaction.data.asset.multiSignatureLegacy = "multiSignatureLegacy mock" as any;
	});

	afterEach(() => {
		Mocks.TransactionRepository.setTransactions([]);
		Managers.configManager.set("network.pubKeyHash", 23);
	});

	it("dependencies should return empty array", async (context) => {
		assert.equal(context.handler.dependencies(), []);
	});

	it("walletAttributes should return array", async (context) => {
		const attributes = context.handler.walletAttributes();

		assert.array(attributes);
		assert.is(attributes.length, 2);
	});

	it("getConstructor should return v1 constructor", async (context) => {
		assert.equal(context.handler.getConstructor(), Transactions.One.MultiSignatureRegistrationTransaction);
	});

	it("bootstrap should resolve", async (context) => {
		stub(context.transactionHistoryService, "streamByCriteria").callsFake(async function* () {
			yield context.multiSignatureTransaction.data;
		});

		await assert.resolves(() => context.handler.bootstrap());

		context.transactionHistoryService.streamByCriteria.calledWith({
			type: Enums.TransactionType.MultiSignature,
			typeGroup: Enums.TransactionTypeGroup.Core,
			version: 1,
		});
	});

	it("bootstrap should throw when wallet has multi signature", async (context) => {
		context.senderWallet.setAttribute("multiSignature", context.multiSignatureAsset);

		await assert.rejects(() => context.handler.bootstrap(), MultiSignatureAlreadyRegisteredError);
	});

	it("bootstrap should throw if asset.multiSignatureLegacy is undefined", async (context) => {
		context.multiSignatureTransaction.data.asset.multiSignatureLegacy = undefined;

		await assert.rejects(() => context.handler.bootstrap(), Exceptions.Runtime.AssertionException);
	});

	it("bootstrap should throw if asset is undefined", async (context) => {
		context.multiSignatureTransaction.data.asset = undefined;

		await assert.rejects(() => context.handler.bootstrap(), Exceptions.Runtime.AssertionException);
	});

	it("isActivated should return true when aip11 is false", async (context) => {
		Managers.configManager.getMilestone().aip11 = false;

		await assert.resolves(() => context.handler.isActivated());
		assert.true(await context.handler.isActivated());
	});

	it("isActivated should return true when aip11 is undefined", async (context) => {
		Managers.configManager.getMilestone().aip11 = undefined;

		await assert.resolves(() => context.handler.isActivated());
		assert.true(await context.handler.isActivated());
	});

	it("isActivated should return false when aip11 is true", async (context) => {
		Managers.configManager.getMilestone().aip11 = true;

		await assert.resolves(() => context.handler.isActivated());
		assert.false(await context.handler.isActivated());
	});

	it("throwIfCannotBeApplied should throw", async (context) => {
		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.multiSignatureTransaction, context.senderWallet),
			LegacyMultiSignatureError,
		);
	});

	it("throwIfCannotEnterPool should throw", async (context) => {
		await assert.rejects(
			() => context.handler.throwIfCannotEnterPool(context.multiSignatureTransaction),
			Contracts.TransactionPool.PoolError,
		);
	});

	it.skip("applyToSender should be ok", async (context) => {
		await assert.resolves(() => context.handler.applyToSender(context.multiSignatureTransaction));
	});

	it("applyToRecipient should be ok", async (context) => {
		await assert.resolves(() => context.handler.applyToRecipient(context.multiSignatureTransaction));
	});

	it("revertForSender should be ok", async (context) => {
		context.senderWallet.setNonce(Utils.BigNumber.ONE);

		await assert.resolves(() => context.handler.revertForSender(context.multiSignatureTransaction));
	});

	it("revertForRecipient should be ok", async (context) => {
		await assert.resolves(() => context.handler.revertForRecipient(context.multiSignatureTransaction));
	});
});
