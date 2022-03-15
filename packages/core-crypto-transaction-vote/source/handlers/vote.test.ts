import {
	AlreadyVotedError,
	InsufficientBalanceError,
	NoVoteError,
	UnvoteMismatchError,
	VotedForNonDelegateError,
} from "@arkecosystem/core-errors";
import { Application, Enums as AppEnums, Exceptions } from "@arkecosystem/core-kernel";
import { Stores, Wallets } from "@arkecosystem/core-state";
import { describe, Factories, Generators, passphrases } from "@arkecosystem/core-test-framework";
import { Mempool } from "@arkecosystem/core-transaction-pool";
import { Crypto, Enums, Interfaces, Managers, Transactions, Utils } from "@arkecosystem/crypto";

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
	voteTransaction: Crypto.ITransaction;
	multiSignatureVoteTransaction: Crypto.ITransaction;
	unvoteTransaction: Crypto.ITransaction;
	multiSignatureUnvoteTransaction: Crypto.ITransaction;
	voteUnvoteTransaction: Crypto.ITransaction;
	unvoteVoteTransaction: Crypto.ITransaction;
	voteVoteTransaction: Crypto.ITransaction;
	unvoteUnvoteTransaction: Crypto.ITransaction;
	delegateWallet1: Wallets.Wallet;
	delegateWallet2: Wallets.Wallet;
	handler: TransactionHandler;
	store: any;
	transactionHistoryService: any;
}>("VoteTransaction", ({ assert, afterEach, beforeEach, it, spy, spyFn, stub }) => {
	beforeEach(async (context) => {
		const mockLastBlockData: Partial<Crypto.IBlockData> = { height: 4, timestamp: Crypto.Slots.getTime() };
		context.store = stub(Stores.StateStore.prototype, "getLastBlock").returnValue({ data: mockLastBlockData });

		context.transactionHistoryService = {
			streamByCriteria: () => {},
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
			Transactions.InternalTransactionType.from(Enums.TransactionType.Vote, Enums.TransactionTypeGroup.Core),
			2,
		);

		context.delegateWallet1 = context.factoryBuilder
			.get("Wallet")
			.withOptions({
				nonce: 0,
				passphrase: passphrases[8],
			})
			.make();
		context.delegateWallet1.setAttribute("delegate", { username: "test1" });
		context.walletRepository.index(context.delegateWallet1);

		context.delegateWallet2 = context.factoryBuilder
			.get("Wallet")
			.withOptions({
				nonce: 0,
				passphrase: passphrases[9],
			})
			.make();
		context.delegateWallet2.setAttribute("delegate", { username: "test2" });
		context.walletRepository.index(context.delegateWallet2);

		context.voteTransaction = Transactions.BuilderFactory.vote()
			.votesAsset(["+" + context.delegateWallet1.getPublicKey()!])
			.nonce("1")
			.sign(passphrases[0])
			.build();

		context.multiSignatureVoteTransaction = Transactions.BuilderFactory.vote()
			.senderPublicKey(context.multiSignatureWallet.getPublicKey()!)
			.votesAsset(["+" + context.delegateWallet1.getPublicKey()!])
			.nonce("1")
			.multiSign(passphrases[0], 0)
			.multiSign(passphrases[1], 1)
			.multiSign(passphrases[2], 2)
			.build();

		context.unvoteTransaction = Transactions.BuilderFactory.vote()
			.votesAsset(["-" + context.delegateWallet1.getPublicKey()!])
			.nonce("1")
			.sign(passphrases[0])
			.build();

		context.multiSignatureUnvoteTransaction = Transactions.BuilderFactory.vote()
			.senderPublicKey(context.multiSignatureWallet.getPublicKey()!)
			.votesAsset(["-" + context.delegateWallet1.getPublicKey()!])
			.nonce("1")
			.multiSign(passphrases[0], 0)
			.multiSign(passphrases[1], 1)
			.multiSign(passphrases[2], 2)
			.build();

		context.voteUnvoteTransaction = Transactions.BuilderFactory.vote()
			.votesAsset(["+" + context.delegateWallet1.getPublicKey()!, "-" + context.delegateWallet1.getPublicKey()!])
			.nonce("1")
			.sign(passphrases[0])
			.build();

		context.unvoteVoteTransaction = Transactions.BuilderFactory.vote()
			.votesAsset(["-" + context.delegateWallet1.getPublicKey()!, "+" + context.delegateWallet2.getPublicKey()!])
			.nonce("1")
			.sign(passphrases[0])
			.build();

		context.voteVoteTransaction = Transactions.BuilderFactory.vote()
			.votesAsset(["+" + context.delegateWallet1.getPublicKey()!, "+" + context.delegateWallet2.getPublicKey()!])
			.nonce("1")
			.sign(passphrases[0])
			.build();

		context.unvoteUnvoteTransaction = Transactions.BuilderFactory.vote()
			.votesAsset(["-" + context.delegateWallet1.getPublicKey()!, "-" + context.delegateWallet2.getPublicKey()!])
			.nonce("1")
			.sign(passphrases[0])
			.build();
	});

	it("bootstrap should resolve", async (context) => {
		stub(context.transactionHistoryService, "streamByCriteria").callsFake(async function* () {
			yield context.voteTransaction.data;
			yield context.unvoteTransaction.data;
		});

		await assert.resolves(() => context.handler.bootstrap());

		context.transactionHistoryService.streamByCriteria.calledWith({
			type: Enums.TransactionType.Vote,
			typeGroup: Enums.TransactionTypeGroup.Core,
		});
	});

	it("bootstrap should throw on vote if wallet already voted", async (context) => {
		context.transactionHistoryService.streamByCriteria = async function* () {
			yield context.voteTransaction.data;
		};
		context.senderWallet.setAttribute("vote", context.delegateWallet1.getPublicKey());

		await assert.rejects(() => context.handler.bootstrap(), AlreadyVotedError);
	});

	it("bootstrap should throw on unvote if wallet did not vote", async (context) => {
		context.transactionHistoryService.streamByCriteria = async function* () {
			yield context.unvoteTransaction.data;
		};

		await assert.rejects(() => context.handler.bootstrap(), NoVoteError);
	});

	it("bootstrap should throw on unvote if wallet vote is mismatch", async (context) => {
		context.transactionHistoryService.streamByCriteria = async function* () {
			yield context.unvoteTransaction.data;
		};
		context.senderWallet.setAttribute("vote", "no_a_public_key");

		await assert.rejects(() => context.handler.bootstrap(), UnvoteMismatchError);
	});

	it("bootstrap should throw if asset is undefined", async (context) => {
		context.unvoteTransaction.data.asset = undefined;
		context.transactionHistoryService.streamByCriteria = async function* () {
			yield context.unvoteTransaction.data;
		};

		await assert.rejects(() => context.handler.bootstrap(), Exceptions.Runtime.AssertionException);
	});

	it("emitEvents should dispatch for vote", async (context) => {
		const emitter: Contracts.Kernel.EventDispatcher = context.app.get<Contracts.Kernel.EventDispatcher>(
			Identifiers.EventDispatcherService,
		);
		const mock = spy(emitter, "dispatch");

		context.handler.emitEvents(context.voteTransaction, emitter);

		mock.calledWith(AppEnums.VoteEvent.Vote);
		mock.notCalledWith(AppEnums.VoteEvent.Unvote);
	});

	it("emitEvents should dispatch for unvote", async (context) => {
		const emitter: Contracts.Kernel.EventDispatcher = context.app.get<Contracts.Kernel.EventDispatcher>(
			Identifiers.EventDispatcherService,
		);
		const mock = spy(emitter, "dispatch");

		context.handler.emitEvents(context.unvoteTransaction, emitter);

		mock.notCalledWith(AppEnums.VoteEvent.Vote);
		mock.calledWith(AppEnums.VoteEvent.Unvote);
	});

	it("emitEvents should dispatch for vote-unvote", async (context) => {
		const emitter: Contracts.Kernel.EventDispatcher = context.app.get<Contracts.Kernel.EventDispatcher>(
			Identifiers.EventDispatcherService,
		);
		const mock = spy(emitter, "dispatch");

		context.handler.emitEvents(context.voteUnvoteTransaction, emitter);

		mock.calledWith(AppEnums.VoteEvent.Vote);
		mock.calledWith(AppEnums.VoteEvent.Unvote);
	});

	it("emitEvents should throw if asset.votes is undefined", async (context) => {
		const emitter: Contracts.Kernel.EventDispatcher = context.app.get<Contracts.Kernel.EventDispatcher>(
			Identifiers.EventDispatcherService,
		);
		context.voteTransaction.data.asset.votes = undefined;

		assert.rejects(
			() => context.handler.emitEvents(context.voteTransaction, emitter),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("emitEvents should throw if asset is undefined", async (context) => {
		const emitter: Contracts.Kernel.EventDispatcher = context.app.get<Contracts.Kernel.EventDispatcher>(
			Identifiers.EventDispatcherService,
		);

		context.voteTransaction.data.asset = undefined;

		assert.rejects(
			() => context.handler.emitEvents(context.voteTransaction, emitter),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("throwIfCannotBeApplied should not throw if the vote is valid and the wallet has not voted", async (context) => {
		assert.resolves(() => context.handler.throwIfCannotBeApplied(context.voteTransaction, context.senderWallet));
	});

	it("throwIfCannotBeApplied should not throw - multi sign vote", async (context) => {
		assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.multiSignatureVoteTransaction, context.multiSignatureWallet),
		);
	});

	it("throwIfCannotBeApplied should not throw if the unvote is valid and the wallet has voted", async (context) => {
		context.senderWallet.setAttribute("vote", context.delegateWallet1.getPublicKey());

		assert.resolves(() => context.handler.throwIfCannotBeApplied(context.unvoteTransaction, context.senderWallet));
	});

	it("throwIfCannotBeApplied should not throw - multi sign unvote", async (context) => {
		context.multiSignatureWallet.setAttribute("vote", context.delegateWallet1.getPublicKey());

		assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(
				context.multiSignatureUnvoteTransaction,
				context.multiSignatureWallet,
			),
		);
	});

	it("throwIfCannotBeApplied should throw if wallet has already voted", async (context) => {
		context.senderWallet.setAttribute("vote", context.delegateWallet1.getPublicKey());

		assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.voteTransaction, context.senderWallet),
			AlreadyVotedError,
		);
	});

	it("throwIfCannotBeApplied should throw if vote for non delegate wallet", async (context) => {
		context.delegateWallet1.forgetAttribute("delegate");
		context.walletRepository.index(context.delegateWallet1);

		assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.voteTransaction, context.senderWallet),
			VotedForNonDelegateError,
		);
	});

	it("throwIfCannotBeApplied should throw if the asset public key differs from the currently voted one", async (context) => {
		context.senderWallet.setAttribute("vote", "a310ad026647eed112d1a46145eed58b8c19c67c505a67f1199361a511ce7860c0");

		assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.unvoteTransaction, context.senderWallet),
			UnvoteMismatchError,
		);
	});

	it("throwIfCannotBeApplied should throw if unvoting a non-voted wallet", async (context) => {
		assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.unvoteTransaction, context.senderWallet),
			NoVoteError,
		);
	});

	it("throwIfCannotBeApplied should throw if wallet has insufficient funds for vote", async (context) => {
		context.senderWallet.setBalance(Utils.BigNumber.ZERO);

		assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.voteTransaction, context.senderWallet),
			InsufficientBalanceError,
		);
	});

	it("throwIfCannotBeApplied should throw if wallet has insufficient funds for unvote", async (context) => {
		context.senderWallet.setBalance(Utils.BigNumber.ZERO);
		context.senderWallet.setAttribute("vote", context.delegateWallet1.getPublicKey());

		assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.unvoteTransaction, context.senderWallet),
			InsufficientBalanceError,
		);
	});

	it("throwIfCannotBeApplied should throw if asset.votes is undefined", async (context) => {
		context.voteTransaction.data.asset.votes = undefined;

		assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.voteTransaction, context.senderWallet),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("throwIfCannotBeApplied should throw if asset is undefined", async (context) => {
		context.voteTransaction.data.asset = undefined;

		assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.voteTransaction, context.senderWallet),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("throwIfCannotBeApplied should not throw on vote+unvote transaction when wallet has not voted", async (context) => {
		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.voteUnvoteTransaction, context.senderWallet),
		);
	});

	it("throwIfCannotBeApplied should throw on vote+unvote transaction when wallet has voted", async (context) => {
		context.senderWallet.setAttribute("vote", context.delegateWallet1.getPublicKey());

		assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.voteUnvoteTransaction, context.senderWallet),
			AlreadyVotedError,
		);
	});

	it("throwIfCannotBeApplied should not throw on unvote+vote transaction when wallet has voted", async (context) => {
		context.senderWallet.setAttribute("vote", context.delegateWallet1.getPublicKey());

		await assert.resolves(() =>
			context.handler.throwIfCannotBeApplied(context.unvoteVoteTransaction, context.senderWallet),
		);
	});

	it("throwIfCannotBeApplied should throw on unvote+vote transaction when wallet has not voted", async (context) => {
		assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.unvoteVoteTransaction, context.senderWallet),
			NoVoteError,
		);
	});

	it("throwIfCannotBeApplied should throw on vote+vote transaction when wallet has not voted", async (context) => {
		assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.voteVoteTransaction, context.senderWallet),
			AlreadyVotedError,
		);
	});

	it("throwIfCannotBeApplied should throw on unvote+unvote transaction when wallet has voted", async (context) => {
		context.senderWallet.setAttribute("vote", context.delegateWallet1.getPublicKey());

		assert.rejects(
			() => context.handler.throwIfCannotBeApplied(context.unvoteUnvoteTransaction, context.senderWallet),
			NoVoteError,
		);
	});

	it("throwIfCannotEnterPool should not throw", async (context) => {
		assert.resolves(() => context.handler.throwIfCannotEnterPool(context.voteTransaction));
	});

	it("throwIfCannotEnterPool should throw if transaction by sender already in pool", async (context) => {
		await context.app.get<Mempool>(Identifiers.TransactionPoolMempool).addTransaction(context.voteTransaction);

		assert.rejects(
			() => context.handler.throwIfCannotEnterPool(context.voteTransaction),
			Contracts.TransactionPool.PoolError,
		);
	});

	it("apply vote should be ok", async (context) => {
		assert.false(context.senderWallet.hasAttribute("vote"));

		await context.handler.apply(context.voteTransaction);
		assert.defined(context.senderWallet.getAttribute("vote"));
	});

	it("apply vote should not be ok", async (context) => {
		context.senderWallet.setAttribute("vote", context.delegateWallet1.getPublicKey());

		assert.defined(context.senderWallet.getAttribute("vote"));

		assert.rejects(() => context.handler.apply(context.voteTransaction), AlreadyVotedError);
		assert.defined(context.senderWallet.getAttribute("vote"));
	});

	it("apply unvote should remove the vote from the wallet", async (context) => {
		context.senderWallet.setAttribute("vote", context.delegateWallet1.getPublicKey());

		assert.defined(context.senderWallet.getAttribute("vote"));

		await context.handler.apply(context.unvoteTransaction);

		assert.false(context.senderWallet.hasAttribute("vote"));
	});

	it("apply vote+unvote should apply when wallet has not voted", async (context) => {
		await context.handler.apply(context.voteUnvoteTransaction);

		assert.false(context.senderWallet.hasAttribute("vote"));
	});

	it("apply vote+unvote should throw when wallet has voted", async (context) => {
		context.senderWallet.setAttribute("vote", context.delegateWallet1.getPublicKey());

		assert.rejects(() => context.handler.apply(context.voteUnvoteTransaction), AlreadyVotedError);
	});

	it("apply unvote+vote should apply when wallet has voted", async (context) => {
		context.senderWallet.setAttribute("vote", context.delegateWallet1.getPublicKey());

		await context.handler.apply(context.unvoteVoteTransaction);

		assert.equal(context.senderWallet.getAttribute("vote"), context.delegateWallet2.getPublicKey());
	});

	it("apply unvote+vote should throw when wallet has not voted", async (context) => {
		assert.rejects(() => context.handler.apply(context.unvoteUnvoteTransaction), NoVoteError);
	});

	it("apply unvote+vote should throw when wallet has voted for different delegate", async (context) => {
		context.senderWallet.setAttribute("vote", context.delegateWallet2.getPublicKey());

		assert.rejects(() => context.handler.apply(context.unvoteUnvoteTransaction), UnvoteMismatchError);
	});

	it("applyForSender should throw if asset.vote is undefined", async (context) => {
		context.voteTransaction.data.asset.votes = undefined;

		context.handler.throwIfCannotBeApplied = spyFn();

		await assert.rejects(
			() => context.handler.applyToSender(context.voteTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("applyForSender should throw if asset is undefined", async (context) => {
		context.voteTransaction.data.asset = undefined;

		context.handler.throwIfCannotBeApplied = spyFn();

		await assert.rejects(
			() => context.handler.applyToSender(context.voteTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("revert vote should remove the vote from the wallet", async (context) => {
		context.senderWallet.setAttribute("vote", context.delegateWallet1.getPublicKey());
		context.senderWallet.setNonce(Utils.BigNumber.make(1));

		assert.defined(context.senderWallet.getAttribute("vote"));

		await context.handler.revert(context.voteTransaction);

		assert.true(context.senderWallet.getNonce().isZero());
		assert.false(context.senderWallet.hasAttribute("vote"));
	});

	it("revert unvote should add the vote to the wallet", async (context) => {
		context.senderWallet.setNonce(Utils.BigNumber.make(1));

		assert.false(context.senderWallet.hasAttribute("vote"));

		await context.handler.revert(context.unvoteTransaction);

		assert.true(context.senderWallet.getNonce().isZero());
		assert.is(context.senderWallet.getAttribute("vote"), context.delegateWallet1.getPublicKey());
	});

	it("revert vote+unvote should revert when wallet has no vote", async (context) => {
		context.senderWallet.setNonce(Utils.BigNumber.make(1));

		await context.handler.revert(context.voteUnvoteTransaction);

		assert.false(context.senderWallet.hasAttribute("vote"));
	});

	it("revert unvote+vote should revert when wallet has no vote", async (context) => {
		context.senderWallet.setAttribute("vote", context.delegateWallet2.getPublicKey());
		context.senderWallet.setNonce(Utils.BigNumber.make(1));

		await context.handler.revert(context.unvoteVoteTransaction);

		assert.equal(context.senderWallet.getAttribute("vote"), context.delegateWallet1.getPublicKey());
	});

	it("revertForSender should throw if asset.vote is undefined", async (context) => {
		context.voteTransaction.data.asset.votes = undefined;
		context.senderWallet.setNonce(Utils.BigNumber.ONE);

		await assert.rejects(
			() => context.handler.revertForSender(context.voteTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});

	it("revertForSender should throw if asset is undefined", async (context) => {
		context.voteTransaction.data.asset = undefined;
		context.senderWallet.setNonce(Utils.BigNumber.ONE);

		await assert.rejects(
			() => context.handler.revertForSender(context.voteTransaction),
			Exceptions.Runtime.AssertionException,
		);
	});
});
