import { Application, Container, Contracts } from "@arkecosystem/core-kernel";
import { Stores, Wallets } from "@arkecosystem/core-state";
import { describe, Factories, Generators, passphrases } from "@arkecosystem/core-test-framework";
import {
	InsufficientBalanceError,
	InvalidMultiSignaturesError,
	LegacyMultiSignatureError,
	MissingMultiSignatureOnSenderError,
	SenderWalletMismatchError,
	UnexpectedNonceError,
	UnsupportedMultiSignatureTransactionError,
} from "../../errors";
import { TransactionHandler, TransactionHandlerConstructor } from "../transaction";
import { TransactionHandlerRegistry } from "../handler-registry";
import { Crypto, Enums, Identities, Interfaces, Managers, Transactions, Utils } from "@arkecosystem/crypto";

import { buildMultiSignatureWallet, buildRecipientWallet, buildSenderWallet, initApp } from "../../../test/app";

class TestTransaction extends Transactions.Transaction {
	public static typeGroup: number = Enums.TransactionTypeGroup.Test;
	public static type: number = 1;
	public static key = "test";
	public static version: number = 2;

	public static getSchema(): Transactions.schemas.TransactionSchema {
		return {
			$id: "test",
		};
	}

	public serialize(options?: any): Utils.ByteBuffer | undefined {
		return new Utils.ByteBuffer(Buffer.alloc(0));
	}

	public deserialize(buf) {
		return;
	}
}

class TestTransactionHandler extends TransactionHandler {
	public getConstructor(): Transactions.TransactionConstructor {
		return TestTransaction;
	}

	public dependencies(): ReadonlyArray<TransactionHandlerConstructor> {
		return [];
	}

	public walletAttributes(): ReadonlyArray<string> {
		return [];
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async bootstrap(): Promise<void> {}

	public async applyToRecipient(transaction: Interfaces.ITransaction): Promise<void> {}

	public async revertForRecipient(transaction: Interfaces.ITransaction): Promise<void> {}
}

describe<{
	app: Application;
	senderWallet: Wallets.Wallet;
	multiSignatureWallet: Wallets.Wallet;
	recipientWallet: Wallets.Wallet;
	walletRepository: Contracts.State.WalletRepository;
	factoryBuilder: Factories.FactoryBuilder;
	transferTransaction: Interfaces.ITransaction;
	multiSignatureTransferTransaction: Interfaces.ITransaction;
	handler: TestTransactionHandler;
	pubKeyHash: number;
	store: any;
}>("General Transaction Tests", ({ assert, afterEach, beforeEach, it, stub }) => {
	beforeEach(async (context) => {
		const mockLastBlockData: Partial<Interfaces.IBlockData> = { height: 4, timestamp: Crypto.Slots.getTime() };
		context.store = stub(Stores.StateStore.prototype, "getLastBlock").returnValue({ data: mockLastBlockData });

		const config = Generators.generateCryptoConfigRaw();
		Managers.configManager.setConfig(config);

		context.pubKeyHash = Managers.configManager.get("network.pubKeyHash");

		context.app = initApp();

		context.app.bind(Container.Identifiers.TransactionHandler).to(TestTransactionHandler);
		context.app.bind(Container.Identifiers.TransactionHistoryService).toConstantValue(null);

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
			Transactions.InternalTransactionType.from(TestTransaction.type, Enums.TransactionTypeGroup.Test),
			2,
		);

		context.transferTransaction = Transactions.BuilderFactory.transfer()
			.recipientId(context.recipientWallet.getAddress())
			.amount("10000000")
			.nonce(Utils.BigNumber.ONE.toString())
			.sign(passphrases[0])
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
		Managers.configManager.set("network.pubKeyHash", context.pubKeyHash);
		Managers.configManager.getMilestone().aip11 = undefined;
		process.env.CORE_ENV = undefined;
		Transactions.TransactionRegistry.deregisterTransactionType(TestTransaction);
	});

	it("verify should be verified", async (context) => {
		await assert.resolves(() => context.handler.verify(context.transferTransaction));
		assert.true(await context.handler.verify(context.transferTransaction));
	});

	it("verify should be verified with multi sign", async (context) => {
		await assert.resolves(() => context.handler.verify(context.multiSignatureTransferTransaction));
		assert.true(await context.handler.verify(context.multiSignatureTransferTransaction));
	});

	it("throwIfCannotBeApplied should not throw", async (context) => {
		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.transferTransaction, context.senderWallet),
		);
	});

	it("throwIfCannotBeApplied should not throw if version is undefined", async (context) => {
		// context.transferTransaction.data.nonce = Utils.BigNumber.ONE;
		context.transferTransaction.data.version = undefined;
		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.transferTransaction, context.senderWallet),
		);
	});

	it("throwIfCannotBeApplied should throw if wallet publicKey does not match transaction senderPublicKey", async (context) => {
		context.transferTransaction.data.nonce = Utils.BigNumber.ONE;
		context.transferTransaction.data.senderPublicKey = "a".repeat(66);

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.transferTransaction, context.senderWallet),
			SenderWalletMismatchError,
		);
	});

	it("throwIfCannotBeApplied should throw if nonce is invalid", async (context) => {
		context.senderWallet.setNonce(Utils.BigNumber.make(1));
		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.transferTransaction, context.senderWallet),
			UnexpectedNonceError,
		);
	});

	it("throwIfCannotBeApplied should not throw if transaction nonce is undefined", async (context) => {
		context.transferTransaction.data.nonce = undefined;

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.transferTransaction, context.senderWallet),
			UnexpectedNonceError,
		);
	});

	it("throwIfCannotBeApplied should throw if sender has legacy multi signature", async (context) => {
		const multiSignatureAsset: Interfaces.IMultiSignatureAsset = {
			publicKeys: [
				Identities.PublicKey.fromPassphrase(passphrases[0]),
				Identities.PublicKey.fromPassphrase(passphrases[1]),
				Identities.PublicKey.fromPassphrase(passphrases[2]),
			],
			min: 2,
			// @ts-ignore
			legacy: true,
		};

		context.senderWallet.setAttribute("multiSignature", multiSignatureAsset);

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.transferTransaction, context.senderWallet),
			LegacyMultiSignatureError,
		);
	});

	it("throwIfCannotBeApplied should throw if sender has multi signature, but indexed wallet has not", async (context) => {
		const multiSignatureAsset: Interfaces.IMultiSignatureAsset = {
			publicKeys: [
				Identities.PublicKey.fromPassphrase(passphrases[0]),
				Identities.PublicKey.fromPassphrase(passphrases[1]),
				Identities.PublicKey.fromPassphrase(passphrases[2]),
			],
			min: 2,
		};

		const multiSigWallet = buildSenderWallet(context.factoryBuilder);
		multiSigWallet.setAttribute("multiSignature", multiSignatureAsset);

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.transferTransaction, multiSigWallet),
			MissingMultiSignatureOnSenderError,
		);
	});

	it("throwIfCannotBeApplied should throw if sender and transaction multi signatures does not match", async (context) => {
		const multiSignatureAsset: Interfaces.IMultiSignatureAsset = {
			publicKeys: [
				Identities.PublicKey.fromPassphrase(passphrases[1]),
				Identities.PublicKey.fromPassphrase(passphrases[0]),
				Identities.PublicKey.fromPassphrase(passphrases[2]),
			],
			min: 2,
		};

		context.multiSignatureWallet.setAttribute("multiSignature", multiSignatureAsset);

		await assert.rejects(
			() =>
				context.handler.throwIfCannotBeApplied(
					context.multiSignatureTransferTransaction,
					context.multiSignatureWallet,
				),
			InvalidMultiSignaturesError,
		);
	});

	it("throwIfCannotBeApplied should throw if transaction has signatures and it is not multi signature registration", async (context) => {
		context.transferTransaction.data.signatures = [
			"009fe6ca3b83a9a5e693fecb2b184900c5135a8c07e704c473b2f19117630f840428416f583f1a24ff371ba7e6fbca9a7fb796226ef9ef6542f44ed911951ac88d",
			"0116779a98b2009b35d4003dda7628e46365f1a52068489bfbd80594770967a3949f76bc09e204eddd7d460e1e519b826c53dc6e2c9573096326dbc495050cf292",
			"02687bd0f4a91be39daf648a5b1e1af5ffa4a3d4319b2e38b1fc2dc206db03f542f3b26c4803e0b4c8a53ddfb6cf4533b512d71ae869d4e4ccba989c4a4222396b",
		];

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.transferTransaction, context.senderWallet),
			UnsupportedMultiSignatureTransactionError,
		);
	});

	it("throwIfCannotBeApplied should throw if wallet has not enough balance", async (context) => {
		// 1 arktoshi short
		context.senderWallet.setBalance(
			context.transferTransaction.data.amount.plus(context.transferTransaction.data.fee).minus(1),
		);
		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.transferTransaction, context.senderWallet),
			InsufficientBalanceError,
		);
	});

	it("throwIfCannotBeApplied should be true even with publicKey case mismatch", async (context) => {
		context.transferTransaction.data.senderPublicKey =
			context.transferTransaction.data.senderPublicKey!.toUpperCase();
		context.senderWallet.setPublicKey(context.senderWallet.getPublicKey()!.toLowerCase());

		const instance: Interfaces.ITransaction = Transactions.TransactionFactory.fromData(
			context.transferTransaction.data,
		);
		await assert.resolves(() => context.handler.throwIfCannotBeApplied(instance, context.senderWallet));
	});

	it("apply should resolve", async (context) => {
		await assert.resolves(() => context.handler.apply(context.transferTransaction));
	});

	it("apply should not fail due to case mismatch", async (context) => {
		const transactionData: Interfaces.ITransactionData = context.transferTransaction.data;
		transactionData.senderPublicKey = transactionData.senderPublicKey?.toUpperCase();
		const instance = Transactions.TransactionFactory.fromData(transactionData);

		const senderBalance = context.senderWallet.getBalance();

		await context.handler.apply(instance);

		assert.equal(
			context.senderWallet.getBalance(),
			Utils.BigNumber.make(senderBalance).minus(instance.data.amount).minus(instance.data.fee),
		);
	});

	it("apply should resolve with V1", async (context) => {
		Managers.configManager.getMilestone().aip11 = false;

		context.transferTransaction = Transactions.BuilderFactory.transfer()
			.recipientId(context.recipientWallet.getAddress())
			.amount("10000000")
			.nonce("1")
			.sign(passphrases[0])
			.build();

		await assert.resolves(() => context.handler.apply(context.transferTransaction));
	});

	it("apply should throw with negative balance", async (context) => {
		context.senderWallet.setBalance(Utils.BigNumber.ZERO);
		await assert.rejects(() => context.handler.apply(context.transferTransaction), InsufficientBalanceError);
	});

	it("apply should throw with negative balance if environment is not test", async (context) => {
		process.env.CORE_ENV === "unitest";
		context.senderWallet.setBalance(Utils.BigNumber.ZERO);
		await assert.rejects(() => context.handler.apply(context.transferTransaction), InsufficientBalanceError);
	});

	it("apply should resolve defined as exception", async (context) => {
		Managers.configManager.set("network.pubKeyHash", 99);
		await assert.resolves(() => context.handler.apply(context.transferTransaction));
	});

	it("revert should resolve", async (context) => {
		await assert.resolves(() => context.handler.apply(context.transferTransaction));
		await assert.resolves(() => context.handler.revert(context.transferTransaction));
	});

	it("revert should resolve if version is undefined", async (context) => {
		context.transferTransaction.data.version = undefined;

		await assert.resolves(() => context.handler.apply(context.transferTransaction));
		await assert.resolves(() => context.handler.revert(context.transferTransaction));
	});

	it("revert should throw if nonce is undefined", async (context) => {
		await assert.resolves(() => context.handler.apply(context.transferTransaction));
		context.transferTransaction.data.nonce = undefined;
		await assert.rejects(() => context.handler.revert(context.transferTransaction), UnexpectedNonceError);
	});

	it("revert should throw if nonce is invalid", async (context) => {
		await assert.resolves(() => context.handler.apply(context.transferTransaction));
		context.senderWallet.setNonce(Utils.BigNumber.make(100));
		await assert.rejects(() => context.handler.revert(context.transferTransaction), UnexpectedNonceError);
	});

	it("revert should not fail due to case mismatch", async (context) => {
		context.senderWallet.setNonce(Utils.BigNumber.make(1));

		const transactionData: Interfaces.ITransactionData = context.transferTransaction.data;
		transactionData.senderPublicKey = transactionData.senderPublicKey?.toUpperCase();
		const instance = Transactions.TransactionFactory.fromData(transactionData);

		const senderBalance = context.senderWallet.getBalance();

		await context.handler.revert(instance);
		assert.equal(
			context.senderWallet.getBalance(),
			Utils.BigNumber.make(senderBalance).plus(instance.data.amount).plus(instance.data.fee),
		);

		assert.true(context.senderWallet.getNonce().isZero());
	});

	it("emitEvents should be ok", async (context) => {
		// @ts-ignore
		context.handler.emitEvents(context.transferTransaction, {});
	});

	it("throwIfCannotEnterPool should resolve", async (context) => {
		await assert.resolves(() => context.handler.throwIfCannotEnterPool(context.transferTransaction));
	});
});

describe<{
	app: Application;
	senderWallet: Wallets.Wallet;
	multiSignatureWallet: Wallets.Wallet;
	recipientWallet: Wallets.Wallet;
	walletRepository: Contracts.State.WalletRepository;
	factoryBuilder: Factories.FactoryBuilder;
	transferTransaction: Interfaces.ITransaction;
	handler: TestTransactionHandler;
	store: any;
}>("Special Transaction Tests", ({ assert, afterEach, beforeEach, it, stub }) => {
	beforeEach(async (context) => {
		const mockLastBlockData: Partial<Interfaces.IBlockData> = { height: 4, timestamp: Crypto.Slots.getTime() };
		context.store = stub(Stores.StateStore.prototype, "getLastBlock").returnValue({ data: mockLastBlockData });

		const config = Generators.generateCryptoConfigRaw();
		Managers.configManager.setConfig(config);

		context.app = initApp();

		context.app.bind(Container.Identifiers.TransactionHandler).to(TestTransactionHandler);
		context.app.bind(Container.Identifiers.TransactionHistoryService).toConstantValue(null);

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
			Transactions.InternalTransactionType.from(TestTransaction.type, Enums.TransactionTypeGroup.Test),
			2,
		);

		context.transferTransaction = Transactions.BuilderFactory.transfer()
			.amount("10000000")
			.recipientId(context.recipientWallet.getAddress())
			.sign("secret")
			.nonce("0")
			.build();

		context.handler = transactionHandlerRegistry.getRegisteredHandlerByType(
			Transactions.InternalTransactionType.from(Enums.TransactionType.Transfer, Enums.TransactionTypeGroup.Core),
			2,
		);

		Managers.configManager.getMilestone().aip11 = true;
	});

	afterEach(() => {
		Managers.configManager.getMilestone().aip11 = undefined;
		process.env.CORE_ENV = undefined;
		Transactions.TransactionRegistry.deregisterTransactionType(TestTransaction);
	});

	it("dynamicFees should correctly calculate the transaction fee based on transaction size and addonBytes", async (context) => {
		const addonBytes = 137;

		assert.equal(
			context.handler.dynamicFee({
				transaction: context.transferTransaction,
				addonBytes,
				satoshiPerByte: 3,
				height: 1,
			}),
			Utils.BigNumber.make(137 + context.transferTransaction.serialized.length / 2).times(3),
		);

		assert.equal(
			context.handler.dynamicFee({
				transaction: context.transferTransaction,
				addonBytes,
				satoshiPerByte: 6,
				height: 1,
			}),
			Utils.BigNumber.make(137 + context.transferTransaction.serialized.length / 2).times(6),
		);

		assert.equal(
			context.handler.dynamicFee({
				transaction: context.transferTransaction,
				addonBytes: 0,
				satoshiPerByte: 9,
				height: 1,
			}),
			Utils.BigNumber.make(context.transferTransaction.serialized.length / 2).times(9),
		);
	});

	it("dynamicFees should default satoshiPerByte to 1 if value provided is <= 0", async (context) => {
		assert.equal(
			context.handler.dynamicFee({
				transaction: context.transferTransaction,
				addonBytes: 0,
				satoshiPerByte: -50,
				height: 1,
			}),
			context.handler.dynamicFee({
				transaction: context.transferTransaction,
				addonBytes: 0,
				satoshiPerByte: 1,
				height: 1,
			}),
		);
		assert.equal(
			context.handler.dynamicFee({
				transaction: context.transferTransaction,
				addonBytes: 0,
				satoshiPerByte: 0,
				height: 1,
			}),
			context.handler.dynamicFee({
				transaction: context.transferTransaction,
				addonBytes: 0,
				satoshiPerByte: 1,
				height: 1,
			}),
		);
	});
});
