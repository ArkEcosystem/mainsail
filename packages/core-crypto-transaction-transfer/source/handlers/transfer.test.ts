import { Application, Container } from "@arkecosystem/core-kernel";
import { Stores, Wallets } from "@arkecosystem/core-state";
import { describe, Factories, Generators, Mapper, Mocks, passphrases } from "@arkecosystem/core-test-framework";
import { Crypto, Enums, Interfaces, Managers, Transactions, Utils } from "@arkecosystem/crypto";

import { buildMultiSignatureWallet, buildRecipientWallet, buildSenderWallet, initApp } from "../../../test/app";
import { ColdWalletError, InsufficientBalanceError, SenderWalletMismatchError } from "../../errors";
import { TransactionHandlerRegistry } from "../handler-registry";
import { TransactionHandler } from "../transaction";

describe<{
	app: Application;
	senderWallet: Wallets.Wallet;
	multiSignatureWallet: Wallets.Wallet;
	recipientWallet: Wallets.Wallet;
	walletRepository: Contracts.State.WalletRepository;
	factoryBuilder: Factories.FactoryBuilder;
	store: any;
	transferTransaction: Crypto.ITransaction;
	multiSignatureTransferTransaction: Crypto.ITransaction;
	handler: TransactionHandler;
	pubKeyHash: number;
}>("TransferTransaction", ({ assert, afterEach, beforeEach, it, stub }) => {
	beforeEach(async (context) => {
		const mockLastBlockData: Partial<Crypto.IBlockData> = { height: 4, timestamp: Crypto.Slots.getTime() };
		context.store = stub(Stores.StateStore.prototype, "getLastBlock").returnValue({ data: mockLastBlockData });

		Managers.configManager.setConfig(Generators.generateCryptoConfigRaw());

		context.app = initApp();
		context.app.bind(Identifiers.TransactionHistoryService).toConstantValue(null);

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

		context.pubKeyHash = Managers.configManager.get("network.pubKeyHash");
		const transactionHandlerRegistry: TransactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.TransactionHandlerRegistry,
		);
		context.handler = transactionHandlerRegistry.getRegisteredHandlerByType(
			Transactions.InternalTransactionType.from(Enums.TransactionType.Transfer, Enums.TransactionTypeGroup.Core),
			2,
		);

		context.transferTransaction = Transactions.BuilderFactory.transfer()
			.recipientId(context.recipientWallet.getAddress())
			.amount("10000000")
			.sign(passphrases[0])
			.nonce("1")
			.build();

		context.multiSignatureTransferTransaction = Transactions.BuilderFactory.transfer()
			.senderPublicKey(context.multiSignatureWallet.getPublicKey()!)
			.recipientId(context.recipientWallet.getAddress())
			.amount("1")
			.nonce("1")
			.multiSign(passphrases[0], 0)
			.multiSign(passphrases[1], 1)
			.multiSign(passphrases[2], 2)
			.build();
	});

	afterEach((context) => {
		Mocks.TransactionRepository.setTransactions([]);
		Managers.configManager.set("network.pubKeyHash", context.pubKeyHash);
		context.store.restore();
	});

	it("bootstrap should resolve", async (context) => {
		Mocks.TransactionRepository.setTransactions([Mapper.mapTransactionToModel(context.transferTransaction)]);
		await assert.resolves(() => context.handler.bootstrap());
	});

	it("hasVendorField should return true", (context) => {
		assert.true(context.handler.hasVendorField());
	});

	it("throwIfCannotBeApplied should not throw", async (context) => {
		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.transferTransaction, context.senderWallet),
		);
	});

	it("throwIfCannotBeApplied should not throw - multi sign", async (context) => {
		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(
				context.multiSignatureTransferTransaction,
				context.multiSignatureWallet,
			),
		);
	});

	it("throwIfCannotBeApplied should throw", async (context) => {
		context.transferTransaction.data.senderPublicKey = "a".repeat(66);

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.transferTransaction, context.senderWallet),
			SenderWalletMismatchError,
			"Failed to apply transaction, because the public key does not match the wallet.",
		);
	});

	it("throwIfCannotBeApplied should throw if wallet has insufficient funds for vote", async (context) => {
		context.senderWallet.setBalance(Utils.BigNumber.ZERO);

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.transferTransaction, context.senderWallet),
			InsufficientBalanceError,
			"Insufficient balance in the wallet.",
		);
	});

	it("throwIfCannotBeApplied should throw if sender is cold wallet", async (context) => {
		const coldWallet: Wallets.Wallet = context.factoryBuilder
			.get("Wallet")
			.withOptions({
				nonce: 0,
				passphrase: passphrases[3],
			})
			.make();

		coldWallet.setBalance(Utils.BigNumber.ZERO);

		context.transferTransaction = Transactions.BuilderFactory.transfer()
			.amount("10000000")
			.recipientId(context.recipientWallet.getAddress())
			.nonce("1")
			.sign(passphrases[3])
			.build();

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.transferTransaction, coldWallet),
			ColdWalletError,
			"Insufficient balance in database wallet. Wallet is not allowed to spend before funding is confirmed.",
		);
	});

	it("throwIfCannotBeApplied should not throw if recipient is cold wallet", async (context) => {
		const coldWallet: Wallets.Wallet = context.factoryBuilder
			.get("Wallet")
			.withOptions({
				nonce: 0,
				passphrase: passphrases[3],
			})
			.make();

		coldWallet.setBalance(Utils.BigNumber.ZERO);

		context.transferTransaction = Transactions.BuilderFactory.transfer()
			.amount("10000000")
			.recipientId(coldWallet.getAddress())
			.nonce("1")
			.sign(passphrases[0])
			.build();

		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.transferTransaction, context.senderWallet),
		);
	});

	it("throwIfCannotEnterPool should not throw", async (context) => {
		await assert.resolves(() => context.handler.throwIfCannotEnterPool(context.transferTransaction));
	});

	it("should throw if no wallet is not recipient on the active network", async (context) => {
		Managers.configManager.set("network.pubKeyHash", 99);

		await assert.rejects(
			() => context.handler.throwIfCannotEnterPool(context.transferTransaction),
			Contracts.TransactionPool.PoolError,
			"Recipient AWrp3vKnMoefPXRyooJdX9zGjsyv1QKUG7 is not on the same network: 99",
		);
	});

	it("apply should be ok", async (context) => {
		const senderBalance = context.senderWallet.getBalance();
		const recipientBalance = context.recipientWallet.getBalance();

		await context.handler.apply(context.transferTransaction);

		assert.equal(
			context.senderWallet.getBalance(),
			Utils.BigNumber.make(senderBalance)
				.minus(context.transferTransaction.data.amount)
				.minus(context.transferTransaction.data.fee),
		);

		assert.equal(
			context.recipientWallet.getBalance(),
			Utils.BigNumber.make(recipientBalance).plus(context.transferTransaction.data.amount),
		);
	});

	it("revert should be ok", async (context) => {
		const senderBalance = context.senderWallet.getBalance();
		const recipientBalance = context.recipientWallet.getBalance();

		await context.handler.apply(context.transferTransaction);

		assert.equal(
			context.senderWallet.getBalance(),
			Utils.BigNumber.make(senderBalance)
				.minus(context.transferTransaction.data.amount)
				.minus(context.transferTransaction.data.fee),
		);

		assert.equal(
			context.recipientWallet.getBalance(),
			Utils.BigNumber.make(recipientBalance).plus(context.transferTransaction.data.amount),
		);

		await context.handler.revert(context.transferTransaction);

		assert.equal(context.senderWallet.getBalance(), Utils.BigNumber.make(senderBalance));

		assert.equal(context.recipientWallet.getBalance(), recipientBalance);
	});
});
