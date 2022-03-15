import {
	InsufficientBalanceError,
	InvalidMultiSignatureError,
	LegacyMultiSignatureRegistrationError,
	MultiSignatureAlreadyRegisteredError,
	MultiSignatureKeyCountMismatchError,
	MultiSignatureMinimumKeysError,
} from "@arkecosystem/core-errors";
import { Application, Container, Exceptions, Services } from "@arkecosystem/core-kernel";
import { Stores, Wallets } from "@arkecosystem/core-state";
import { describe, Factories, Generators, getWalletAttributeSet, passphrases } from "@arkecosystem/core-test-framework";
import { Mempool } from "@arkecosystem/core-transaction-pool";
import { Crypto, Enums, Errors, Identities, Interfaces, Managers, Transactions, Utils } from "@arkecosystem/crypto";

import { buildRecipientWallet, buildSenderWallet, initApp } from "../../../test/app";
import { TransactionHandlerRegistry } from "../handler-registry";
import { TransactionHandler } from "../transaction";

describe<{
	app: Application;
	senderWallet: Wallets.Wallet;
	recipientWallet: Wallets.Wallet;
	walletRepository: Contracts.State.WalletRepository;
	factoryBuilder: Factories.FactoryBuilder;
	multiSignatureTransaction: Crypto.ITransaction;
	multiSignatureAsset: Crypto.IMultiSignatureAsset;
	handler: TransactionHandler;
	store: any;
	transactionHistoryService: any;
}>("MultiSignatureRegistrationTransaction", ({ assert, afterEach, beforeEach, it, spyFn, stub }) => {
	beforeEach(async (context) => {
		const mockLastBlockData: Partial<Crypto.IBlockData> = { height: 4, timestamp: Crypto.Slots.getTime() };
		context.store = stub(Stores.StateStore.prototype, "getLastBlock").returnValue({ data: mockLastBlockData });

		context.transactionHistoryService = {
			streamByCriteria: async function* () {
				yield context.multiSignatureTransaction.data;
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
		context.recipientWallet = buildRecipientWallet(context.factoryBuilder);

		context.walletRepository.index(context.senderWallet);
		context.walletRepository.index(context.recipientWallet);
		const transactionHandlerRegistry: TransactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Identifiers.TransactionHandlerRegistry,
		);
		context.handler = transactionHandlerRegistry.getRegisteredHandlerByType(
			Transactions.InternalTransactionType.from(
				Enums.TransactionType.MultiSignature,
				Enums.TransactionTypeGroup.Core,
			),
			2,
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
			.multiSignatureAsset(context.multiSignatureAsset)
			.senderPublicKey(context.senderWallet.getPublicKey()!)
			.nonce("1")
			.recipientId(context.recipientWallet.getPublicKey()!)
			.multiSign(passphrases[0], 0)
			.multiSign(passphrases[1], 1)
			.multiSign(passphrases[2], 2)
			.sign(passphrases[0])
			.build();
	});

	afterEach(() => {
		Managers.configManager.getMilestone().aip11 = true;
	});

	it("bootstrap should resolve", async (context) => {
		stub(context.transactionHistoryService, "streamByCriteria").callsFake(async function* () {
			yield context.multiSignatureTransaction.data;
		});

		await assert.resolves(() => context.handler.bootstrap());

		context.transactionHistoryService.streamByCriteria.calledWith({
			type: Enums.TransactionType.MultiSignature,
			typeGroup: Enums.TransactionTypeGroup.Core,
			version: 2,
		});
	});

	it("bootstrap should throw if wallet is multi signature", async (context) => {
		context.recipientWallet.setAttribute(
			"multiSignature",
			context.multiSignatureTransaction.data.asset.multiSignature,
		);
		await assert.rejects(() => context.handler.bootstrap(), MultiSignatureAlreadyRegisteredError);
	});

	it("bootstrap should throw if asset is undefined", async (context) => {
		context.multiSignatureTransaction.data.asset = undefined;

		await assert.rejects(() => context.handler.bootstrap(), Exceptions.Runtime.AssertionException);
	});

	it("throwIfCannotBeApplied should not throw", async (context) => {
		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.multiSignatureTransaction, context.senderWallet),
		);
	});

	it("throwIfCannotBeApplied should throw if asset is undefined", async (context) => {
		context.multiSignatureTransaction.data.asset = undefined;

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.multiSignatureTransaction, context.senderWallet),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("throwIfCannotBeApplied should throw if the wallet already has multisignatures", async (context) => {
		context.recipientWallet.setAttribute(
			"multiSignature",
			context.multiSignatureTransaction.data.asset.multiSignature,
		);

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.multiSignatureTransaction, context.senderWallet),
			MultiSignatureAlreadyRegisteredError,
		);
	});

	it("throwIfCannotBeApplied should throw if failure to verify signatures", async (context) => {
		context.handler.verifySignatures = () => false;
		context.senderWallet.forgetAttribute("multiSignature");

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.multiSignatureTransaction, context.senderWallet),
			InvalidMultiSignatureError,
		);
	});

	it("throwIfCannotBeApplied should throw with aip11 set to false and transaction is legacy", async (context) => {
		const legacyAssset: Crypto.IMultiSignatureLegacyAsset = {
			keysgroup: [
				"+039180ea4a8a803ee11ecb462bb8f9613fcdb5fe917e292dbcc73409f0e98f8f22",
				"+028d3611c4f32feca3e6713992ae9387e18a0e01954046511878fe078703324dc0",
				"+021d3932ab673230486d0f956d05b9e88791ee298d9af2d6df7d9ed5bb861c92dd",
			],
			// @ts-ignore
			legacy: true,

			lifetime: 0,

			min: 3,
		};

		context.multiSignatureTransaction.data.version = 1;
		context.multiSignatureTransaction.data.timestamp = 1000;
		context.multiSignatureTransaction.data.asset.legacyAsset = legacyAssset;

		Managers.configManager.getMilestone().aip11 = false;

		context.handler.verifySignatures = () => true;

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.multiSignatureTransaction, context.senderWallet),
			LegacyMultiSignatureRegistrationError,
		);
	});

	// TODO: check value 02 thwors DuplicateParticipantInMultiSignatureError, 03 throws nodeError
	it("throwIfCannotBeApplied should throw if failure to verify signatures in asset", async (context) => {
		context.multiSignatureTransaction.data.signatures[0] =
			context.multiSignatureTransaction.data.signatures[0].replace("00", "02");

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.multiSignatureTransaction, context.senderWallet),
			Error,
			// InvalidMultiSignatureError,
		);
	});

	it("throwIfCannotBeApplied should throw if the number of keys is less than minimum", async (context) => {
		context.senderWallet.forgetAttribute("multiSignature");

		context.handler.verifySignatures = () => true;
		// @ts-ignore
		Transactions.Verifier.verifySecondSignature = () => true;

		context.multiSignatureTransaction.data.asset!.multiSignature!.publicKeys.splice(0, 2);
		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.multiSignatureTransaction, context.senderWallet),
			MultiSignatureMinimumKeysError,
		);
	});

	it("throwIfCannotBeApplied should throw if the number of keys does not equal the signature count", async (context) => {
		context.senderWallet.forgetAttribute("multiSignature");

		context.handler.verifySignatures = () => true;
		// @ts-ignore
		Transactions.Verifier.verifySecondSignature = () => true;

		context.multiSignatureTransaction.data.signatures!.splice(0, 2);
		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.multiSignatureTransaction, context.senderWallet),
			MultiSignatureKeyCountMismatchError,
		);
	});

	it("throwIfCannotBeApplied should throw if the same participant provides multiple signatures", async (context) => {
		const passphrases = ["secret1", "secret2", "secret3"];
		const participants = [
			Identities.PublicKey.fromPassphrase(passphrases[0]),
			Identities.PublicKey.fromPassphrase(passphrases[1]),
			Identities.PublicKey.fromPassphrase(passphrases[2]),
		];

		const participantWallet = context.walletRepository.findByPublicKey(participants[0]);
		participantWallet.setBalance(Utils.BigNumber.make(1e8 * 100));

		context.multiSignatureTransaction = Transactions.BuilderFactory.multiSignature()
			.multiSignatureAsset({
				min: 2,
				publicKeys: participants,
			})
			.senderPublicKey(Identities.PublicKey.fromPassphrase(passphrases[0]))
			.nonce("1")
			.recipientId(context.recipientWallet.getPublicKey()!)
			.multiSign(passphrases[0], 0)
			.multiSign(passphrases[1], 1)
			.multiSign(passphrases[2], 2)
			.sign(passphrases[0])
			.build();

		const multiSigWallet = context.walletRepository.findByPublicKey(
			Identities.PublicKey.fromMultiSignatureAsset(context.multiSignatureTransaction.data.asset.multiSignature),
		);

		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.multiSignatureTransaction, participantWallet),
		);

		assert.false(multiSigWallet.hasMultiSignature());

		await context.handler.apply(context.multiSignatureTransaction);

		assert.true(multiSigWallet.hasMultiSignature());

		multiSigWallet.setBalance(Utils.BigNumber.make(1e8 * 100));

		const transferBuilder = context.factoryBuilder
			.get("Transfer")
			.withOptions({
				amount: 10_000_000,
				recipientId: multiSigWallet.getAddress(),
				senderPublicKey: context.senderWallet.getPublicKey(),
			})
			.make()
			// @ts-ignore
			.sign(passphrases[0])
			.nonce("1");

		// Different valid signatures of same payload and private key
		const signatures = [
			"774b430573285f09bd8e61bf04582b06ef55ee0e454cd0f86b396c47ea1269f514748e8fb2315f2f0ce4bb81777ae673d8cab44a54a773f3c20cb0c754fd67ed",
			"dfb75f880769c3ae27640e1214a7ece017ddd684980e2276c908fe7806c1d6e8ceac47bb53004d84bdac22cdcb482445c056256a6cd417c5dc973d8266164ec0",
			"64233bb62b694eb0004e1d5d497b0b0e6d977b3a0e2403a9abf59502aef65c36c6e0eed599d314d4f55a03fc0dc48f0c9c9fd4bfab65e5ac8fe2a5c5ac3ed2ae",
		];

		// All verify with participants[0]
		transferBuilder.data.signatures = [];
		for (const signature of signatures) {
			transferBuilder.data.signatures.push(`${Utils.numberToHex(0)}${signature}`);
		}

		await assert.rejects(() => transferBuilder.build(), Errors.DuplicateParticipantInMultiSignatureError);
		await assert.rejects(
			() => context.handler.verifySignatures(multiSigWallet, transferBuilder.getStruct()),
			Errors.DuplicateParticipantInMultiSignatureError,
		);
	});

	it("throwIfCannotBeApplied should throw if wallet has insufficient funds", async (context) => {
		context.senderWallet.forgetAttribute("multiSignature");
		context.senderWallet.setBalance(Utils.BigNumber.ZERO);

		await assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.multiSignatureTransaction, context.senderWallet),
			InsufficientBalanceError,
		);
	});

	it("throwIfCannotEnterPool should not throw", async (context) => {
		await assert.resolves(() => context.handler.throwIfCannotEnterPool(context.multiSignatureTransaction));
	});

	it("throwIfCannotEnterPool should throw if transaction asset is undefined", async (context) => {
		delete context.multiSignatureTransaction.data.asset;

		await assert.rejects(
			() => context.handler.throwIfCannotEnterPool(context.multiSignatureTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("throwIfCannotEnterPool should throw if transaction by sender already in pool", async (context) => {
		await context.app
			.get<Mempool>(Identifiers.TransactionPoolMempool)
			.addTransaction(context.multiSignatureTransaction);

		await assert.rejects(
			() => context.handler.throwIfCannotEnterPool(context.multiSignatureTransaction),
			Contracts.TransactionPool.PoolError,
			"Sender 03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37 already has a transaction of type '4' in the pool",
		);
	});

	it("throwIfCannotEnterPool should throw if transaction with same address already in pool", async (context) => {
		const anotherSenderWallet = buildSenderWallet(context.factoryBuilder, "random passphrase");

		const multiSignatureTransactionWithSameAddress = Transactions.BuilderFactory.multiSignature()
			.multiSignatureAsset(context.multiSignatureAsset)
			.senderPublicKey(anotherSenderWallet.getPublicKey()!)
			.nonce("1")
			.recipientId(context.recipientWallet.getPublicKey()!)
			.multiSign(passphrases[0], 0)
			.multiSign(passphrases[1], 1)
			.multiSign(passphrases[2], 2)
			.sign("random passphrase")
			.build();

		await context.app
			.get<Mempool>(Identifiers.TransactionPoolMempool)
			.addTransaction(context.multiSignatureTransaction);

		await assert.rejects(
			() => context.handler.throwIfCannotEnterPool(multiSignatureTransactionWithSameAddress),
			Contracts.TransactionPool.PoolError,
			"MultiSignatureRegistration for address ANexvVGYLYUbmTPHAtJ7sb1LxNZwEqKeSv already in the pool",
		);
	});

	it("apply should be ok", async (context) => {
		context.recipientWallet.forgetAttribute("multiSignature");

		assert.false(context.senderWallet.hasAttribute("multiSignature"));
		assert.false(context.recipientWallet.hasAttribute("multiSignature"));

		assert.equal(context.senderWallet.getBalance(), Utils.BigNumber.make(100_390_000_000));
		assert.equal(context.recipientWallet.getBalance(), Utils.BigNumber.ZERO);

		await context.handler.apply(context.multiSignatureTransaction);

		assert.equal(context.senderWallet.getBalance(), Utils.BigNumber.make(98_390_000_000));
		assert.equal(context.recipientWallet.getBalance(), Utils.BigNumber.ZERO);

		assert.false(context.senderWallet.hasAttribute("multiSignature"));
		assert.equal(
			context.recipientWallet.getAttribute("multiSignature"),
			context.multiSignatureTransaction.data.asset.multiSignature,
		);
	});

	it("applyToRecipient should throw if asset is undefined", async (context) => {
		context.multiSignatureTransaction.data.asset = undefined;

		context.handler.throwIfCannotBeApplied = spyFn();

		await assert.rejects(
			() => context.handler.applyToRecipient(context.multiSignatureTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("revert should be ok", async (context) => {
		context.senderWallet.setNonce(Utils.BigNumber.make(1));

		await context.handler.revert(context.multiSignatureTransaction);

		assert.true(context.senderWallet.getNonce().isZero());
		assert.false(context.senderWallet.hasMultiSignature());
		assert.false(context.recipientWallet.hasMultiSignature());
	});

	it("revertForRecipient should throw if asset is undefined", async (context) => {
		context.multiSignatureTransaction.data.asset = undefined;

		await assert.rejects(
			() => context.handler.revertForRecipient(context.multiSignatureTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});
});
