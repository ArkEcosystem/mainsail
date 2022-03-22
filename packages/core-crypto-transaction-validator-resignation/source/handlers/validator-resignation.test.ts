import {
	InsufficientBalanceError,
	NotEnoughDelegatesError,
	VotedForResignedDelegateError,
	WalletAlreadyResignedError,
	WalletNotADelegateError,
} from "@arkecosystem/core-errors";
import { Application, Container, Enums as KernelEnums } from "@arkecosystem/core-kernel";
import { Stores, Wallets } from "@arkecosystem/core-state";
import { describe, Factories, Generators, passphrases } from "@arkecosystem/core-test-framework";
import { Mempool } from "@arkecosystem/core-transaction-pool";
import { Crypto, Enums, Interfaces, Managers, Transactions, Utils } from "@arkecosystem/crypto";

import { buildMultiSignatureWallet, buildRecipientWallet, buildSenderWallet, initApp } from "../../../test/app";
import { TransactionHandlerRegistry } from "../handler-registry";
import { TransactionHandler } from "../transaction";

const delegatePassphrase = "my secret passphrase";

describe<{
	app: Application;
	senderWallet: Wallets.Wallet;
	multiSignatureWallet: Wallets.Wallet;
	recipientWallet: Wallets.Wallet;
	walletRepository: Contracts.State.WalletRepository;
	factoryBuilder: Factories.FactoryBuilder;
	allDelegates: Wallets.Wallet[];
	delegateWallet: Wallets.Wallet;
	delegateResignationTransaction: Crypto.ITransaction;
	handler: TransactionHandler;
	voteHandler: TransactionHandler;
	store: any;
	transactionHistoryService: any;
}>("DelegateResignationTransaction", ({ assert, afterEach, beforeEach, it, spy, stub }) => {
	beforeEach(async (context) => {
		const mockLastBlockData: Partial<Crypto.IBlockData> = { height: 4, timestamp: Crypto.Slots.getTime() };
		context.store = stub(Stores.StateStore.prototype, "getLastBlock").returnValue({ data: mockLastBlockData });

		context.delegateResignationTransaction = Transactions.BuilderFactory.delegateResignation()
			.nonce("1")
			.sign(delegatePassphrase)
			.build();

		context.transactionHistoryService = {
			streamByCriteria: async function* () {
				yield context.delegateResignationTransaction.data;
			},
		};

		const config = Generators.generateCryptoConfigRaw();
		Managers.configManager.setConfig(config);

		context.app = initApp();
		context.app.bind(Identifiers.TransactionHistoryService).toConstantValue(context.transactionHistoryService);

		context.walletRepository = context.app.get<Wallets.WalletRepository>(Identifiers.WalletRepository);

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
			Identifiers.TransactionHandlerRegistry,
		);
		context.handler = transactionHandlerRegistry.getRegisteredHandlerByType(
			Transactions.InternalTransactionType.from(
				Enums.TransactionType.DelegateResignation,
				Enums.TransactionTypeGroup.Core,
			),
			2,
		);
		context.voteHandler = transactionHandlerRegistry.getRegisteredHandlerByType(
			Transactions.InternalTransactionType.from(Enums.TransactionType.Vote, Enums.TransactionTypeGroup.Core),
			2,
		);

		context.allDelegates = [];
		for (const [index, passphrase] of passphrases.entries()) {
			const delegateWallet: Wallets.Wallet = context.factoryBuilder
				.get("Wallet")
				.withOptions({
					nonce: 0,
					passphrase: passphrase,
				})
				.make();

			delegateWallet.setAttribute("delegate", { username: "username" + index });

			context.walletRepository.index(delegateWallet);
			context.allDelegates.push(delegateWallet);
		}

		context.delegateWallet = context.factoryBuilder
			.get("Wallet")
			.withOptions({
				nonce: 0,
				passphrase: delegatePassphrase,
			})
			.make();

		context.delegateWallet.setBalance(Utils.BigNumber.make(66 * 1e8));
		context.delegateWallet.setAttribute("delegate", { username: "dummy" });
		context.walletRepository.index(context.delegateWallet);
	});

	// TODO: assert wallet repository
	it("bootstrap should resolve", async (context) => {
		stub(context.transactionHistoryService, "streamByCriteria").callsFake(async function* () {
			yield context.delegateResignationTransaction.data;
		});

		await assert.resolves(() => context.handler.bootstrap());

		context.transactionHistoryService.streamByCriteria.calledWith({
			type: Enums.TransactionType.DelegateResignation,
			typeGroup: Enums.TransactionTypeGroup.Core,
		});
	});

	it("bootstrap should resolve - simulate genesis wallet", async (context) => {
		context.allDelegates[0].forgetAttribute("delegate");
		context.walletRepository.index(context.allDelegates[0]);

		await assert.resolves(() => context.handler.bootstrap());
	});

	it("emitEvents should dispatch", async (context) => {
		const emitter: Contracts.Kernel.EventDispatcher = context.app.get<Contracts.Kernel.EventDispatcher>(
			Identifiers.EventDispatcherService,
		);

		const mock = spy(emitter, "dispatch");

		context.handler.emitEvents(context.delegateResignationTransaction, emitter);

		mock.calledWith(KernelEnums.DelegateEvent.Resigned);
	});

	it("throwIfCannotBeApplied should not throw if wallet is a delegate", async (context) => {
		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.delegateResignationTransaction, context.delegateWallet),
		);
	});

	it("throwIfCannotBeApplied should not throw if wallet is a delegate due too many delegates", async (context) => {
		const anotherDelegate: Wallets.Wallet = context.factoryBuilder
			.get("Wallet")
			.withOptions({
				nonce: 0,
				passphrase: "anotherDelegate",
			})
			.make();

		anotherDelegate.setAttribute("delegate", { username: "another" });
		context.walletRepository.index(anotherDelegate);

		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.delegateResignationTransaction, context.delegateWallet),
		);
	});

	it("throwIfCannotBeApplied should throw if wallet is not a delegate", async (context) => {
		context.delegateWallet.forgetAttribute("delegate");

		await assert.rejects(
			() =>
				context.handler.throwIfCannotBeApplied(context.delegateResignationTransaction, context.delegateWallet),
			WalletNotADelegateError,
		);
	});

	it("throwIfCannotBeApplied should throw if wallet has insufficient funds", async (context) => {
		context.delegateWallet.setBalance(Utils.BigNumber.ZERO);

		await assert.rejects(
			() =>
				context.handler.throwIfCannotBeApplied(context.delegateResignationTransaction, context.delegateWallet),
			InsufficientBalanceError,
		);
	});

	it("throwIfCannotBeApplied should throw if not enough delegates", async (context) => {
		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.delegateResignationTransaction, context.delegateWallet),
		);

		context.allDelegates[0].setAttribute("delegate.resigned", true);

		await assert.rejects(
			() =>
				context.handler.throwIfCannotBeApplied(context.delegateResignationTransaction, context.delegateWallet),
			NotEnoughDelegatesError,
		);
	});

	it("throwIfCannotBeApplied should throw if not enough delegates due to already resigned delegates", async (context) => {
		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.delegateResignationTransaction, context.delegateWallet),
		);

		context.delegateWallet.setAttribute("delegate.resigned", true);

		await assert.rejects(
			() =>
				context.handler.throwIfCannotBeApplied(context.delegateResignationTransaction, context.delegateWallet),
			WalletAlreadyResignedError,
		);
	});

	// it("throwIfCannotBeApplied should throw if not enough delegates registered", async (context) => {
	//     let anotherDelegateWallet: Wallets.Wallet = context.factoryBuilder
	//         .get("Wallet")
	//         .withOptions({
	//             passphrase: "another delegate passphrase",
	//             nonce: 0
	//         })
	//         .make();
	//
	// 	context.delegateWallet.setAttribute("delegate", {username: "another"});
	//
	//     await assert.resolves(() => context.handler.throwIfCannotBeApplied(context.delegateResignationTransaction, context.delegateWallet));
	// });

	it("throwIfCannotEnterPool should not throw", async (context) => {
		await assert.resolves(() => context.handler.throwIfCannotEnterPool(context.delegateResignationTransaction));
	});

	it("throwIfCannotEnterPool should throw if transaction by sender already in pool", async (context) => {
		await context.app
			.get<Mempool>(Identifiers.TransactionPoolMempool)
			.addTransaction(context.delegateResignationTransaction);

		await assert.rejects(
			() => context.handler.throwIfCannotEnterPool(context.delegateResignationTransaction),
			Contracts.TransactionPool.PoolError,
		);
	});

	it("apply should apply delegate resignation", async (context) => {
		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.delegateResignationTransaction, context.delegateWallet),
		);

		await context.handler.apply(context.delegateResignationTransaction);
		assert.true(context.delegateWallet.getAttribute<boolean>("delegate.resigned"));
	});

	it("apply should fail when already resigned", async (context) => {
		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.delegateResignationTransaction, context.delegateWallet),
		);

		await context.handler.apply(context.delegateResignationTransaction);
		assert.true(context.delegateWallet.getAttribute<boolean>("delegate.resigned"));

		await assert.rejects(
			() =>
				context.handler.throwIfCannotBeApplied(context.delegateResignationTransaction, context.delegateWallet),
			WalletAlreadyResignedError,
		);
	});

	it("apply should fail when not a delegate", async (context) => {
		context.delegateWallet.forgetAttribute("delegate");

		await assert.rejects(
			() =>
				context.handler.throwIfCannotBeApplied(context.delegateResignationTransaction, context.delegateWallet),
			WalletNotADelegateError,
		);
	});

	it("apply should fail when voting for a resigned delegate", async (context) => {
		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.delegateResignationTransaction, context.delegateWallet),
		);

		await context.handler.apply(context.delegateResignationTransaction);
		assert.true(context.delegateWallet.getAttribute<boolean>("delegate.resigned"));

		const voteTransaction = Transactions.BuilderFactory.vote()
			.votesAsset([context.delegateWallet.getPublicKey()])
			.nonce("1")
			.sign(passphrases[0])
			.build();

		await assert.rejects(
			() => context.voteHandler.throwIfCannotBeApplied(voteTransaction, context.senderWallet),
			VotedForResignedDelegateError,
		);
	});

	it("revert should be ok", async (context) => {
		assert.false(context.delegateWallet.hasAttribute("delegate.resigned"));
		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.delegateResignationTransaction, context.delegateWallet),
		);

		await context.handler.apply(context.delegateResignationTransaction);
		assert.true(context.delegateWallet.getAttribute<boolean>("delegate.resigned"));

		await context.handler.revert(context.delegateResignationTransaction);
		assert.false(context.delegateWallet.hasAttribute("delegate.resigned"));
	});
});
