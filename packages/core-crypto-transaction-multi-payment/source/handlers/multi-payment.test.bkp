import { InsufficientBalanceError } from "@arkecosystem/core-errors";
import { Application, Exceptions } from "@arkecosystem/core-kernel";
import { Stores, Wallets } from "@arkecosystem/core-state";
import { describe, Factories, Generators, passphrases } from "@arkecosystem/core-test-framework";
import { Crypto, Enums, Managers, Transactions, Utils } from "@arkecosystem/crypto";

import { buildMultiSignatureWallet, buildRecipientWallet, buildSenderWallet, initApp } from "../../../test/app";
import { TransactionHandlerRegistry } from "../handler-registry";
import { TransactionHandler } from "../transaction";

describe<{
	app: Application;
	senderWallet: Wallets.Wallet;
	multiSignatureWallet: Wallets.Wallet;
	recipientWallet: Wallets.Wallet;
	walletRepository: Contracts.State.WalletRepository;
	factoryBuilder: Factories.FactoryBuilder;
	multiPaymentTransaction: Crypto.ITransaction;
	multiSignatureMultiPaymentTransaction: Crypto.ITransaction;
	handler: TransactionHandler;
	store: any;
	transactionHistoryService: any;
}>("MultiPaymentTransaction", ({ assert, beforeEach, it, spyFn, stub }) => {
	beforeEach(async (context) => {
		const mockLastBlockData: Partial<Crypto.IBlockData> = { height: 4, timestamp: Crypto.Slots.getTime() };
		context.store = stub(Stores.StateStore.prototype, "getLastBlock").returnValue({ data: mockLastBlockData });

		context.transactionHistoryService = {
			streamByCriteria: async function* () {
				yield context.multiPaymentTransaction.data;
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
				Enums.TransactionType.MultiPayment,
				Enums.TransactionTypeGroup.Core,
			),
			2,
		);

		context.multiPaymentTransaction = Transactions.BuilderFactory.multiPayment()
			.addPayment("ARYJmeYHSUTgbxaiqsgoPwf6M3CYukqdKN", "10")
			.addPayment("AFyjB5jULQiYNsp37wwipCm9c7V1xEzTJD", "20")
			.addPayment("AJwD3UJM7UESFnP1fsKYr4EX9Gc1EJNSqm", "30")
			.addPayment("AUsi9ZcFkcwG7WMpRE121TR4HaTjnAP7qD", "40")
			.addPayment("ARugw4i18i2pVnYZEMWKJj2mAnQQ97wuat", "50")
			.nonce("1")
			.sign(passphrases[0])
			.build();

		context.multiSignatureMultiPaymentTransaction = Transactions.BuilderFactory.multiPayment()
			.addPayment("ARYJmeYHSUTgbxaiqsgoPwf6M3CYukqdKN", "10")
			.addPayment("AFyjB5jULQiYNsp37wwipCm9c7V1xEzTJD", "20")
			.addPayment("AJwD3UJM7UESFnP1fsKYr4EX9Gc1EJNSqm", "30")
			.addPayment("AUsi9ZcFkcwG7WMpRE121TR4HaTjnAP7qD", "40")
			.addPayment("ARugw4i18i2pVnYZEMWKJj2mAnQQ97wuat", "50")
			.nonce("1")
			.senderPublicKey(context.multiSignatureWallet.getPublicKey()!)
			.multiSign(passphrases[0], 0)
			.multiSign(passphrases[1], 1)
			.multiSign(passphrases[2], 2)
			.build();
	});

	it("bootstrap should resolve", async (context) => {
		stub(context.transactionHistoryService, "streamByCriteria").callsFake(async function* () {
			yield context.multiPaymentTransaction.data;
		});

		await assert.resolves(() => context.handler.bootstrap());

		context.transactionHistoryService.streamByCriteria.calledWith({
			type: Enums.TransactionType.MultiPayment,
			typeGroup: Enums.TransactionTypeGroup.Core,
		});
	});

	it("bootstrap should throw if asset is undefined", async (context) => {
		context.multiPaymentTransaction.data.asset = undefined;

		await assert.rejects(() => context.handler.bootstrap(), Exceptions.Runtime.AssertionException);
	});

	it("throwIfCannotBeApplied should not throw", async (context) => {
		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.multiPaymentTransaction, context.senderWallet),
		);
	});

	it("throwIfCannotBeApplied should not throw - multi sign", async (context) => {
		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(
				context.multiSignatureMultiPaymentTransaction,
				context.multiSignatureWallet,
			),
		);
	});

	it("throwIfCannotBeApplied should throw if asset is undefined", async (context) => {
		context.multiPaymentTransaction.data.asset = undefined;

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.multiPaymentTransaction, context.senderWallet),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("throwIfCannotBeApplied should throw if wallet has insufficient funds", async (context) => {
		context.senderWallet.setBalance(Utils.BigNumber.ZERO);

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.multiPaymentTransaction, context.senderWallet),
			InsufficientBalanceError,
		);
	});

	it("throwIfCannotBeApplied should throw if wallet has insufficient funds send all payouts", async (context) => {
		context.senderWallet.setBalance(Utils.BigNumber.make(150)); // short by the fee

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.multiPaymentTransaction, context.senderWallet),
			InsufficientBalanceError,
		);
	});

	it("apply should be ok", async (context) => {
		const senderBalance = context.senderWallet.getBalance();
		const totalPaymentsAmount = context.multiPaymentTransaction.data.asset.payments.reduce(
			(previous, current) => previous.plus(current.amount),
			Utils.BigNumber.ZERO,
		);

		await context.handler.apply(context.multiPaymentTransaction);

		assert.equal(
			context.senderWallet.getBalance(),
			Utils.BigNumber.make(senderBalance)
				.minus(totalPaymentsAmount)
				.minus(context.multiPaymentTransaction.data.fee),
		);

		for (const { recipientId, amount } of context.multiPaymentTransaction.data.asset.payments) {
			const paymentRecipientWallet = context.walletRepository.findByAddress(recipientId);
			assert.equal(paymentRecipientWallet.getBalance(), amount);
		}
	});

	it("applyToSender should throw if asset is undefined", async (context) => {
		context.multiPaymentTransaction.data.asset = undefined;

		context.handler.throwIfCannotBeApplied = spyFn();

		await assert.rejects(
			() => context.handler.applyToSender(context.multiPaymentTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("applyToRecipient should throw if asset is undefined", async (context) => {
		context.multiPaymentTransaction.data.asset = undefined;

		await assert.rejects(
			() => context.handler.applyToRecipient(context.multiPaymentTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("revert should be ok", async (context) => {
		const senderBalance = context.senderWallet.getBalance();
		context.senderWallet.setNonce(Utils.BigNumber.make(1));

		for (const { recipientId, amount } of context.multiPaymentTransaction.data.asset.payments) {
			const paymentRecipientWallet = context.walletRepository.findByAddress(recipientId);
			paymentRecipientWallet.setBalance(amount);
		}
		const totalPaymentsAmount = context.multiPaymentTransaction.data.asset.payments.reduce(
			(previous, current) => previous.plus(current.amount),
			Utils.BigNumber.ZERO,
		);

		await context.handler.revert(context.multiPaymentTransaction);
		assert.equal(
			context.senderWallet.getBalance(),
			Utils.BigNumber.make(senderBalance)
				.plus(totalPaymentsAmount)
				.plus(context.multiPaymentTransaction.data.fee),
		);

		assert.true(context.senderWallet.getNonce().isZero());
		assert.equal(context.recipientWallet.getBalance(), Utils.BigNumber.ZERO);
	});

	it("revertForSender should throw if asset is undefined", async (context) => {
		context.senderWallet.setNonce(Utils.BigNumber.ONE);

		context.multiPaymentTransaction.data.asset = undefined;

		await assert.rejects(
			() => context.handler.revertForSender(context.multiPaymentTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("revertForRecipient should throw if asset is undefined", async (context) => {
		context.multiPaymentTransaction.data.asset = undefined;

		await assert.rejects(
			() => context.handler.revertForRecipient(context.multiPaymentTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});
});
