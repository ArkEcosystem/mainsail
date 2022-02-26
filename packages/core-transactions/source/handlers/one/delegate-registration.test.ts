import { Application, Container, Contracts, Enums as KernelEnums, Exceptions } from "@arkecosystem/core-kernel";
import { Stores, Wallets } from "@arkecosystem/core-state";
import { describe, Factories, Generators, Mocks, passphrases } from "@arkecosystem/core-test-framework";
import { Mempool } from "@arkecosystem/core-transaction-pool";
import { Crypto, Enums, Identities, Interfaces, Managers, Transactions, Utils } from "@arkecosystem/crypto";
import {
	InsufficientBalanceError,
	NotSupportedForMultiSignatureWalletError,
	WalletIsAlreadyDelegateError,
	WalletUsernameAlreadyRegisteredError,
} from "../../errors";
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
	delegateRegistrationTransaction: Interfaces.ITransaction;
	store: any;
	transactionHistoryService: any;
}>("DelegateRegistrationTransaction", ({ assert, afterEach, beforeEach, it, spy, spyFn, stub }) => {
	beforeEach((context) => {
		const mockLastBlockData: Partial<Interfaces.IBlockData> = { height: 4, timestamp: Crypto.Slots.getTime() };
		context.store = stub(Stores.StateStore.prototype, "getLastBlock").returnValue({ data: mockLastBlockData });

		context.delegateRegistrationTransaction = Transactions.BuilderFactory.delegateRegistration()
			.usernameAsset("dummy")
			.nonce("1")
			.sign(passphrases[0])
			.build();

		context.transactionHistoryService = {
			streamByCriteria: async function* () {
				yield context.delegateRegistrationTransaction.data;
			},
		};

		const config = Generators.generateCryptoConfigRaw();
		Managers.configManager.setConfig(config);

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
				Enums.TransactionType.DelegateRegistration,
				Enums.TransactionTypeGroup.Core,
			),
			2,
		);
	});

	afterEach(() => {
		Mocks.BlockRepository.setDelegateForgedBlocks([]);
		Mocks.BlockRepository.setLastForgedBlocks([]);
	});

	it("dependencies should return empty array", async (context) => {
		assert.equal(context.handler.dependencies(), []);
	});

	it("walletAttributes should return array", async (context) => {
		const attributes = context.handler.walletAttributes();

		assert.array(attributes);
		assert.is(attributes.length, 11);
	});

	it("getConstructor should return v2 constructor", async (context) => {
		assert.equal(context.handler.getConstructor(), Transactions.Two.DelegateRegistrationTransaction);
	});

	it("isActivated should return true", async (context) => {
		await assert.resolves(() => context.handler.isActivated());
		assert.true(await context.handler.isActivated());
	});

	it("bootstrap should resolve", async (context) => {
		stub(context.transactionHistoryService, "streamByCriteria").callsFake(async function* () {
			yield context.delegateRegistrationTransaction.data;
		});

		assert.false(context.senderWallet.hasAttribute("delegate"));

		await assert.resolves(() => context.handler.bootstrap());

		context.transactionHistoryService.streamByCriteria.calledWith({
			type: Enums.TransactionType.DelegateRegistration,
			typeGroup: Enums.TransactionTypeGroup.Core,
		});
		assert.true(context.walletRepository.getIndex(Contracts.State.WalletIndexes.Usernames).has("dummy"));
		assert.true(context.senderWallet.hasAttribute("delegate"));
		assert.equal(context.senderWallet.getAttribute("delegate"), {
			forgedFees: Utils.BigNumber.ZERO,
			forgedRewards: Utils.BigNumber.ZERO,
			producedBlocks: 0,
			rank: undefined,
			username: "dummy",
			voteBalance: Utils.BigNumber.ZERO,
		});
	});

	it("bootstrap should not resolve if asset.delegate.username is undefined", async (context) => {
		context.delegateRegistrationTransaction.data.asset.delegate.username = undefined;

		assert.false(context.senderWallet.hasAttribute("delegate"));

		await assert.rejects(() => context.handler.bootstrap(), Exceptions.Runtime.AssertionException);

		assert.false(context.walletRepository.getIndex(Contracts.State.WalletIndexes.Usernames).has("dummy"));
		assert.false(context.senderWallet.hasAttribute("delegate"));
	});

	it("bootstrap should not resolve if asset.delegate is undefined", async (context) => {
		context.delegateRegistrationTransaction.data.asset.delegate = undefined;

		assert.false(context.senderWallet.hasAttribute("delegate"));

		await assert.rejects(() => context.handler.bootstrap(), Exceptions.Runtime.AssertionException);
		assert.false(context.walletRepository.getIndex(Contracts.State.WalletIndexes.Usernames).has("dummy"));
		assert.false(context.senderWallet.hasAttribute("delegate"));
	});

	it("bootstrap should not resolve if asset is undefined", async (context) => {
		context.delegateRegistrationTransaction.data.asset = undefined;

		assert.false(context.senderWallet.hasAttribute("delegate"));

		await assert.rejects(() => context.handler.bootstrap(), Exceptions.Runtime.AssertionException);
		assert.false(context.walletRepository.getIndex(Contracts.State.WalletIndexes.Usernames).has("dummy"));
		assert.false(context.senderWallet.hasAttribute("delegate"));
	});

	it("bootstrap should resolve with bocks", async (context) => {
		Mocks.BlockRepository.setDelegateForgedBlocks([
			{
				generatorPublicKey: Identities.PublicKey.fromPassphrase(passphrases[0]),
				totalFees: "2",
				totalProduced: 1,
				totalRewards: "2",
			},
		]);

		const lastForgedBlock = {
			generatorPublicKey: Identities.PublicKey.fromPassphrase(passphrases[0]),
			height: "1",
			id: "123",
			timestamp: 1,
		};

		Mocks.BlockRepository.setLastForgedBlocks([lastForgedBlock]);

		assert.false(context.senderWallet.hasAttribute("delegate"));

		await assert.resolves(() => context.handler.bootstrap());

		assert.true(context.walletRepository.getIndex(Contracts.State.WalletIndexes.Usernames).has("dummy"));
		assert.true(context.senderWallet.hasAttribute("delegate"));
		assert.equal(context.senderWallet.getAttribute("delegate.lastBlock"), lastForgedBlock);

		const delegateAttributes: any = context.senderWallet.getAttribute("delegate");
		assert.equal(delegateAttributes.username, "dummy");
		assert.equal(delegateAttributes.voteBalance, Utils.BigNumber.ZERO);
		assert.equal(delegateAttributes.forgedFees, Utils.BigNumber.make("2"));
		assert.equal(delegateAttributes.forgedRewards, Utils.BigNumber.make("2"));
		assert.equal(delegateAttributes.producedBlocks, 1);
		assert.undefined(delegateAttributes.rank);
	});

	it("bootstrap should resolve with bocks and genesis wallet", async (context) => {
		stub(context.transactionHistoryService, "streamByCriteria").callsFake(async function* () {});

		Mocks.BlockRepository.setDelegateForgedBlocks([
			{
				generatorPublicKey: Identities.PublicKey.fromPassphrase(passphrases[0]),
				totalFees: "2",
				totalProduced: 1,
				totalRewards: "2",
			},
		]);

		Mocks.BlockRepository.setLastForgedBlocks([
			{
				generatorPublicKey: Identities.PublicKey.fromPassphrase(passphrases[0]),
				height: "1",
				id: "123",
				timestamp: 1,
			},
		]);

		await assert.resolves(() => context.handler.bootstrap());

		assert.false(context.walletRepository.getIndex(Contracts.State.WalletIndexes.Usernames).has("dummy"));
		assert.false(context.senderWallet.hasAttribute("delegate"));
	});

	it("emitEvents should dispatch", async (context) => {
		const emitter: Contracts.Kernel.EventDispatcher = context.app.get<Contracts.Kernel.EventDispatcher>(
			Container.Identifiers.EventDispatcherService,
		);

		const mock = spy(emitter, "dispatch");

		context.handler.emitEvents(context.delegateRegistrationTransaction, emitter);

		mock.calledWith(KernelEnums.DelegateEvent.Registered);
	});

	it("throwIfCannotBeApplied should not throw", async (context) => {
		const mock = spy(TransactionHandler.prototype, "throwIfCannotBeApplied");

		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.delegateRegistrationTransaction, context.senderWallet),
		);

		mock.calledOnce();
	});

	it("throwIfCannotBeApplied should throw if wallet has a multi signature", async (context) => {
		const multiSignatureAsset: Interfaces.IMultiSignatureAsset = {
			min: 2,
			publicKeys: [
				Identities.PublicKey.fromPassphrase(passphrases[21]),
				Identities.PublicKey.fromPassphrase(passphrases[22]),
				Identities.PublicKey.fromPassphrase(passphrases[23]),
			],
		};

		context.senderWallet.setAttribute("multiSignature", multiSignatureAsset);

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.delegateRegistrationTransaction, context.senderWallet),
			NotSupportedForMultiSignatureWalletError,
		);
	});

	it("throwIfCannotBeApplied should throw if asset.delegate.username is undefined", async (context) => {
		context.delegateRegistrationTransaction.data.asset.delegate.username = undefined;

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.delegateRegistrationTransaction, context.senderWallet),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("throwIfCannotBeApplied should throw if asset.delegate is undefined", async (context) => {
		context.delegateRegistrationTransaction.data.asset.delegate = undefined;

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.delegateRegistrationTransaction, context.senderWallet),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("throwIfCannotBeApplied should throw if asset is undefined", async (context) => {
		context.delegateRegistrationTransaction.data.asset = undefined;

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.delegateRegistrationTransaction, context.senderWallet),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("throwIfCannotBeApplied should throw if wallet is delegate", async (context) => {
		context.senderWallet.setAttribute("delegate", { username: "dummy" });
		context.walletRepository.index(context.senderWallet);

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.delegateRegistrationTransaction, context.senderWallet),
			WalletIsAlreadyDelegateError,
		);
	});

	it("throwIfCannotBeApplied should throw if wallet is resigned delegate", async (context) => {
		context.senderWallet.setAttribute("delegate", { username: "dummy" });
		context.senderWallet.setAttribute("delegate.resigned", true);
		context.walletRepository.index(context.senderWallet);

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.delegateRegistrationTransaction, context.senderWallet),
			WalletIsAlreadyDelegateError,
		);
	});

	it("throwIfCannotBeApplied should throw if another wallet already registered a username", async (context) => {
		const delegateWallet: Wallets.Wallet = context.factoryBuilder
			.get("Wallet")
			.withOptions({
				nonce: 0,
				passphrase: "delegate passphrase",
			})
			.make();

		delegateWallet.setAttribute("delegate", { username: "dummy" });

		context.walletRepository.index(delegateWallet);

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.delegateRegistrationTransaction, context.senderWallet),
			WalletUsernameAlreadyRegisteredError,
		);
	});

	it("throwIfCannotBeApplied should throw if wallet has insufficient funds", async (context) => {
		context.senderWallet.setBalance(Utils.BigNumber.ZERO);

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.delegateRegistrationTransaction, context.senderWallet),
			InsufficientBalanceError,
		);
	});

	it("throwIfCannotBeApplied should throw if wallet nonce is invalid", async (context) => {
		context.senderWallet.setNonce(Utils.BigNumber.ONE);

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.delegateRegistrationTransaction, context.senderWallet),
			"UnexpectedNonceError",
		);
	});

	it("throwIfCannotEnterPool should not throw", async (context) => {
		await assert.resolves(() => context.handler.throwIfCannotEnterPool(context.delegateRegistrationTransaction));
	});

	it("throwIfCannotEnterPool should throw if transaction by sender already in pool", async (context) => {
		await context.app
			.get<Mempool>(Container.Identifiers.TransactionPoolMempool)
			.addTransaction(context.delegateRegistrationTransaction);

		await assert.rejects(
			() => context.handler.throwIfCannotEnterPool(context.delegateRegistrationTransaction),
			Contracts.TransactionPool.PoolError,
		);
	});

	it("throwIfCannotEnterPool should throw if transaction with same username already in pool", async (context) => {
		const anotherWallet: Wallets.Wallet = context.factoryBuilder
			.get("Wallet")
			.withOptions({
				nonce: 0,
				passphrase: passphrases[2],
			})
			.make();

		anotherWallet.setBalance(Utils.BigNumber.make(7_527_654_310));

		context.walletRepository.index(anotherWallet);

		const anotherDelegateRegistrationTransaction = Transactions.BuilderFactory.delegateRegistration()
			.usernameAsset("dummy")
			.nonce("1")
			.sign(passphrases[2])
			.build();

		await context.app
			.get<Mempool>(Container.Identifiers.TransactionPoolMempool)
			.addTransaction(anotherDelegateRegistrationTransaction);

		await assert.rejects(
			() => context.handler.throwIfCannotEnterPool(context.delegateRegistrationTransaction),
			Contracts.TransactionPool.PoolError,
		);
	});

	it("throwIfCannotEnterPool should throw if asset.delegate.username is undefined", async (context) => {
		context.delegateRegistrationTransaction.data.asset.delegate.username = undefined;

		await assert.rejects(
			() => context.handler.throwIfCannotEnterPool(context.delegateRegistrationTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("throwIfCannotEnterPool should throw if asset.delegate is undefined", async (context) => {
		context.delegateRegistrationTransaction.data.asset.delegate = undefined;

		await assert.rejects(
			() => context.handler.throwIfCannotEnterPool(context.delegateRegistrationTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("throwIfCannotEnterPool should throw if asset is undefined", async (context) => {
		context.delegateRegistrationTransaction.data.asset = undefined;

		await assert.rejects(
			() => context.handler.throwIfCannotEnterPool(context.delegateRegistrationTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("apply and revert should resolve", async (context) => {
		const walletBalance = context.senderWallet.getBalance();

		const mock = spy(TransactionHandler.prototype, "applyToSender");

		await context.handler.apply(context.delegateRegistrationTransaction);

		mock.calledOnce();

		assert.equal(
			context.senderWallet.getBalance(),
			walletBalance.minus(context.delegateRegistrationTransaction.data.fee),
		);
		assert.equal(context.senderWallet.getNonce(), Utils.BigNumber.ONE);
		assert.is(context.senderWallet.getAttribute("delegate.username"), "dummy");
		assert.true(context.walletRepository.getIndex(Contracts.State.WalletIndexes.Usernames).has("dummy"));
		assert.is(
			context.walletRepository.getIndex(Contracts.State.WalletIndexes.Usernames).get("dummy"),
			context.senderWallet,
		);

		const mock2 = spy(TransactionHandler.prototype, "revertForSender");

		await context.handler.revert(context.delegateRegistrationTransaction);

		mock2.calledOnce();

		assert.equal(context.senderWallet.getBalance(), walletBalance);
		assert.equal(context.senderWallet.getNonce(), Utils.BigNumber.ZERO);
		assert.false(context.senderWallet.hasAttribute("delegate.username"));
		assert.false(context.walletRepository.getIndex(Contracts.State.WalletIndexes.Usernames).has("dummy"));
	});

	it("applyForSender should set username to wallet and index", async (context) => {
		await context.handler.applyToSender(context.delegateRegistrationTransaction);

		assert.equal(context.senderWallet.getAttribute("delegate.username"), "dummy");
		assert.true(context.walletRepository.getIndex(Contracts.State.WalletIndexes.Usernames).has("dummy"));
	});

	it("applyForSender should throw if asset.delegate.username is undefined", async (context) => {
		context.delegateRegistrationTransaction.data.asset.delegate.username = undefined;
		context.handler.throwIfCannotBeApplied = spyFn();

		await assert.rejects(
			() => context.handler.applyToSender(context.delegateRegistrationTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("applyForSender should throw if asset.delegate is undefined", async (context) => {
		context.delegateRegistrationTransaction.data.asset.delegate = undefined;
		context.handler.throwIfCannotBeApplied = spyFn();

		await assert.rejects(
			() => context.handler.applyToSender(context.delegateRegistrationTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("applyForSender should throw if asset is undefined", async (context) => {
		context.delegateRegistrationTransaction.data.asset = undefined;
		context.handler.throwIfCannotBeApplied = spyFn();

		await assert.rejects(
			() => context.handler.applyToSender(context.delegateRegistrationTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});
});
