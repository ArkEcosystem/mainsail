import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { ValidatorRegistrationTransactionHandler } from "@mainsail/crypto-transaction-validator-registration";
import { Enums as AppEnums } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { describe, Sandbox } from "../../../test-framework";
import { VoteTransaction } from "../versions";
import { VoteTransactionHandler } from "./index";

describe<{
	sandbox: Sandbox;
	walletRepository: any;
	poolQuery: any;
	handler: VoteTransactionHandler;
}>("VoteHandler", ({ beforeEach, it, assert, stub }) => {
	const wallet: Partial<Contracts.State.Wallet> = {
		forgetAttribute: () => false,
		getAttribute: <T>() => "" as unknown as T,
		hasAttribute: () => false,
		setAttribute: () => false,
	};

	const validatorWallet: Partial<Contracts.State.Wallet> = {
		forgetAttribute: () => false,
		getAttribute: <T>() => "" as unknown as T,
		hasAttribute: () => false,
		isValidator: () => false,
		setAttribute: () => false,
	};

	let spyForgetAttribute;
	let spyGetAttribute;
	let spyHasAttribute;
	let spySetAttribute;

	let spyValidatorForgetAttribute;
	let spyValidatorGetAttribute;
	let spyValidatorHasAttribute;
	let spyValidatorSetAttribute;
	let spyValidatorIsValidator;

	const getTransaction = (votes: string[], unvotes: string[]): Partial<Contracts.Crypto.Transaction> => {
		const transactionData: Partial<Contracts.Crypto.TransactionData> = {
			asset: {
				unvotes: unvotes,
				votes: votes,
			},
			senderPublicKey: "senderPublicKey",
			type: VoteTransaction.type,
			typeGroup: VoteTransaction.typeGroup,
		};

		return {
			data: transactionData as Contracts.Crypto.TransactionData,
		};
	};

	beforeEach((context) => {
		context.walletRepository = {
			findByPublicKey: () => { },
		};

		context.poolQuery = {
			getAllBySender: () => context.poolQuery,
			has: () => false,
			whereKind: () => context.poolQuery,
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.StateService).toConstantValue({});
		context.sandbox.app.bind(Identifiers.LogService).toConstantValue({});
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});
		context.sandbox.app.bind(Identifiers.Cryptography.Transaction.Verifier).toConstantValue({});
		context.sandbox.app.bind(Identifiers.TransactionPoolQuery).toConstantValue(context.poolQuery);

		context.handler = context.sandbox.app.resolve(VoteTransactionHandler);

		spyHasAttribute = stub(wallet, "hasAttribute");
		spyGetAttribute = stub(wallet, "getAttribute");
		spySetAttribute = stub(wallet, "setAttribute");
		spyForgetAttribute = stub(wallet, "forgetAttribute");

		spyValidatorHasAttribute = stub(validatorWallet, "hasAttribute");
		spyValidatorGetAttribute = stub(validatorWallet, "getAttribute");
		spyValidatorSetAttribute = stub(validatorWallet, "setAttribute");
		spyValidatorForgetAttribute = stub(validatorWallet, "forgetAttribute");
		spyValidatorIsValidator = stub(validatorWallet, "isValidator");
	});

	it("#dependencies -  should depend on ValidatorRegistrationTransaction", ({ handler }) => {
		assert.equal(handler.dependencies(), [ValidatorRegistrationTransactionHandler]);
	});

	it("#walletAttributes -  should return vote", ({ handler }) => {
		assert.equal(handler.walletAttributes(), [{ name: "vote", type: Contracts.State.AttributeType.String }]);
	});

	it("#getConstructor -  should return VoteTransaction", ({ handler }) => {
		assert.equal(handler.getConstructor(), VoteTransaction);
	});

	it("#isActivated -  should return true", async ({ handler }) => {
		assert.true(await handler.isActivated());
	});

	it("throwIfCannotBeApplied - vote should pass", async ({ handler, walletRepository }) => {
		spyHasAttribute.returnValue(false);
		spyValidatorHasAttribute.returnValue(false);
		spyValidatorIsValidator.returnValue(true);
		stub(walletRepository, "findByPublicKey").resolvedValue(validatorWallet);
		const spySuper = stub(Handlers.TransactionHandler.prototype, "throwIfCannotBeApplied");

		await assert.resolves(() =>
			handler.throwIfCannotBeApplied(
				walletRepository,
				getTransaction(["validatorPublicKey"], []) as Contracts.Crypto.Transaction,
				wallet as Contracts.State.Wallet,
			),
		);

		spySuper.calledOnce();
		spyHasAttribute.calledWith("vote");
		spyValidatorHasAttribute.calledWith("validatorResigned");
		spyValidatorIsValidator.calledOnce();
	});

	it("throwIfCannotBeApplied - should throw if already voted", async ({ handler, walletRepository }) => {
		spyHasAttribute.returnValue(true);
		spyGetAttribute.returnValue("validatorPublicKey");
		stub(walletRepository, "findByPublicKey").resolvedValue(validatorWallet);
		const spySuper = stub(Handlers.TransactionHandler.prototype, "throwIfCannotBeApplied");

		await assert.rejects(
			() =>
				handler.throwIfCannotBeApplied(
					walletRepository,
					getTransaction(["validatorPublicKey"], []) as Contracts.Crypto.Transaction,
					wallet as Contracts.State.Wallet,
				),
			Exceptions.AlreadyVotedError,
		);

		spySuper.neverCalled();
		spyHasAttribute.calledWith("vote");
		spyGetAttribute.calledWith("vote");
	});

	it("throwIfCannotBeApplied - should throw if validator is resigned", async ({ handler, walletRepository }) => {
		spyHasAttribute.returnValue(false);
		spyValidatorHasAttribute.returnValue(true);
		spyValidatorIsValidator.returnValue(true);
		stub(walletRepository, "findByPublicKey").resolvedValue(validatorWallet);
		const spySuper = stub(Handlers.TransactionHandler.prototype, "throwIfCannotBeApplied");

		await assert.rejects(
			() =>
				handler.throwIfCannotBeApplied(
					walletRepository,
					getTransaction(["validatorPublicKey"], []) as Contracts.Crypto.Transaction,
					wallet as Contracts.State.Wallet,
				),
			Exceptions.VotedForResignedValidatorError,
		);

		spySuper.neverCalled();
		spyHasAttribute.calledWith("vote");
		spyValidatorHasAttribute.calledWith("validatorResigned");
	});

	it("throwIfCannotBeApplied - should throw if voted is not validator", async ({ handler, walletRepository }) => {
		spyHasAttribute.returnValue(false);
		spyValidatorIsValidator.returnValue(false);
		stub(walletRepository, "findByPublicKey").resolvedValue(validatorWallet);
		const spySuper = stub(Handlers.TransactionHandler.prototype, "throwIfCannotBeApplied");

		await assert.rejects(
			() =>
				handler.throwIfCannotBeApplied(
					walletRepository,
					getTransaction(["validatorPublicKey"], []) as Contracts.Crypto.Transaction,
					wallet as Contracts.State.Wallet,
				),
			Exceptions.VotedForNonValidatorError,
		);

		spySuper.neverCalled();
		spyHasAttribute.calledWith("vote");
		spyValidatorIsValidator.calledOnce();
		spyValidatorHasAttribute.neverCalled();
	});

	it("throwIfCannotBeApplied - unvote should pass", async ({ handler, walletRepository }) => {
		spyHasAttribute.returnValue(true);
		spyGetAttribute.returnValue("validatorPublicKey");
		spyValidatorIsValidator.returnValue(true);
		stub(walletRepository, "findByPublicKey").resolvedValue(validatorWallet);
		const spySuper = stub(Handlers.TransactionHandler.prototype, "throwIfCannotBeApplied");

		await assert.resolves(() =>
			handler.throwIfCannotBeApplied(
				walletRepository,
				getTransaction([], ["validatorPublicKey"]) as Contracts.Crypto.Transaction,
				wallet as Contracts.State.Wallet,
			),
		);

		spySuper.calledOnce();
		spyHasAttribute.calledWith("vote");
		spyValidatorHasAttribute.neverCalled();
		spyValidatorIsValidator.calledOnce();
	});

	it("throwIfCannotBeApplied - unvote should pass if validator is resigned", async ({
		handler,
		walletRepository,
	}) => {
		spyHasAttribute.returnValue(true);
		spyGetAttribute.returnValue("validatorPublicKey");
		spyValidatorIsValidator.returnValue(true);
		spyValidatorHasAttribute.returnValue(true);
		stub(walletRepository, "findByPublicKey").resolvedValue(validatorWallet);
		const spySuper = stub(Handlers.TransactionHandler.prototype, "throwIfCannotBeApplied");

		await assert.resolves(() =>
			handler.throwIfCannotBeApplied(
				walletRepository,
				getTransaction([], ["validatorPublicKey"]) as Contracts.Crypto.Transaction,
				wallet as Contracts.State.Wallet,
			),
		);

		spySuper.calledOnce();
		spyHasAttribute.calledWith("vote");
		spyValidatorHasAttribute.neverCalled();
		spyValidatorIsValidator.calledOnce();
	});

	it("throwIfCannotBeApplied - should throw if wallet have no vote", async ({ handler, walletRepository }) => {
		spyHasAttribute.returnValue(false);
		stub(walletRepository, "findByPublicKey").resolvedValue(validatorWallet);
		const spySuper = stub(Handlers.TransactionHandler.prototype, "throwIfCannotBeApplied");

		await assert.rejects(
			() =>
				handler.throwIfCannotBeApplied(
					walletRepository,
					getTransaction([], ["validatorPublicKey"]) as Contracts.Crypto.Transaction,
					wallet as Contracts.State.Wallet,
				),
			Exceptions.NoVoteError,
		);

		spySuper.neverCalled();
		spyHasAttribute.calledWith("vote");
	});

	it("throwIfCannotBeApplied - should throw on unvote mismatch", async ({ handler, walletRepository }) => {
		spyHasAttribute.returnValue(true);
		spyGetAttribute.returnValue("invalidPublicKey");
		stub(walletRepository, "findByPublicKey").resolvedValue(validatorWallet);
		const spySuper = stub(Handlers.TransactionHandler.prototype, "throwIfCannotBeApplied");

		await assert.rejects(
			() =>
				handler.throwIfCannotBeApplied(
					walletRepository,
					getTransaction([], ["validatorPublicKey"]) as Contracts.Crypto.Transaction,
					wallet as Contracts.State.Wallet,
				),
			Exceptions.UnvoteMismatchError,
		);

		spySuper.neverCalled();
		spyHasAttribute.calledWith("vote");
		spyGetAttribute.calledWith("vote");
	});

	it("throwIfCannotBeApplied - should throw if unvoted is not validator", async ({ handler, walletRepository }) => {
		spyHasAttribute.returnValue(true);
		spyGetAttribute.returnValue("validatorPublicKey");
		spyValidatorIsValidator.returnValue(false);
		stub(walletRepository, "findByPublicKey").resolvedValue(validatorWallet);
		const spySuper = stub(Handlers.TransactionHandler.prototype, "throwIfCannotBeApplied");

		await assert.rejects(
			() =>
				handler.throwIfCannotBeApplied(
					walletRepository,
					getTransaction([], ["validatorPublicKey"]) as Contracts.Crypto.Transaction,
					wallet as Contracts.State.Wallet,
				),
			Exceptions.VotedForNonValidatorError,
		);

		spySuper.neverCalled();
		spyHasAttribute.calledWith("vote");
		spyGetAttribute.calledWith("vote");
		spyValidatorIsValidator.calledOnce();
	});

	it("throwIfCannotBeApplied - should pass on unvote and vote", async ({ handler, walletRepository }) => {
		spyHasAttribute.returnValue(true);
		spyGetAttribute.returnValue("validatorPublicKey");
		spyValidatorIsValidator.returnValue(true);
		stub(walletRepository, "findByPublicKey").resolvedValue(validatorWallet);
		const spySuper = stub(Handlers.TransactionHandler.prototype, "throwIfCannotBeApplied");

		await assert.resolves(() =>
			handler.throwIfCannotBeApplied(
				walletRepository,
				getTransaction(["secondValidatorPublicKey"], ["validatorPublicKey"]) as Contracts.Crypto.Transaction,
				wallet as Contracts.State.Wallet,
			),
		);

		spySuper.calledOnce();
		spyHasAttribute.calledWith("vote");
		spyGetAttribute.calledWith("vote");
		spyValidatorIsValidator.calledTimes(2);
	});

	it("throwIfCannotBeApplied - should throw on empty vote", async ({ handler, walletRepository }) => {
		const spySuper = stub(Handlers.TransactionHandler.prototype, "throwIfCannotBeApplied");

		await assert.rejects(
			() =>
				handler.throwIfCannotBeApplied(
					walletRepository,
					getTransaction([], []) as Contracts.Crypto.Transaction,
					wallet as Contracts.State.Wallet,
				),
			Exceptions.EmptyVoteError,
		);

		spySuper.neverCalled();
	});

	it("throwIfCannotBeApplied - should throw on max votes exceedeed", async ({ handler, walletRepository }) => {
		const spySuper = stub(Handlers.TransactionHandler.prototype, "throwIfCannotBeApplied");

		await assert.rejects(
			() =>
				handler.throwIfCannotBeApplied(
					walletRepository,
					getTransaction(
						["ValidatorPublicKey", "secondValidatorPublicKey"],
						[],
					) as Contracts.Crypto.Transaction,
					wallet as Contracts.State.Wallet,
				),
			Exceptions.MaxVotesExceeededError,
		);

		spySuper.neverCalled();
	});

	it("throwIfCannotBeApplied - should throw on max unvotes exceedeed", async ({ handler, walletRepository }) => {
		const spySuper = stub(Handlers.TransactionHandler.prototype, "throwIfCannotBeApplied");

		await assert.rejects(
			() =>
				handler.throwIfCannotBeApplied(
					walletRepository,
					getTransaction(
						[],
						["ValidatorPublicKey", "secondValidatorPublicKey"],
					) as Contracts.Crypto.Transaction,
					wallet as Contracts.State.Wallet,
				),
			Exceptions.MaxUnvotesExceeededError,
		);

		spySuper.neverCalled();
	});

	it("emitEvents - should dispatch", ({ handler }) => {
		const emitter: Partial<Contracts.Kernel.EventDispatcher> = {
			dispatch: async () => { },
		};
		const spyDispatch = stub(emitter, "dispatch");

		const voteTransaction = getTransaction(["validatorPublicKey"], []);

		handler.emitEvents(
			voteTransaction as Contracts.Crypto.Transaction,
			emitter as Contracts.Kernel.EventDispatcher,
		);

		spyDispatch.calledOnce();
		spyDispatch.calledWith(AppEnums.VoteEvent.Vote, {
			transaction: voteTransaction.data,
			validator: "validatorPublicKey",
		});

		spyDispatch.reset();
		const unvoteTransaction = getTransaction([], ["validatorPublicKey"]);
		handler.emitEvents(
			unvoteTransaction as Contracts.Crypto.Transaction,
			emitter as Contracts.Kernel.EventDispatcher,
		);

		spyDispatch.calledOnce();
		spyDispatch.calledWith(AppEnums.VoteEvent.Unvote, {
			transaction: unvoteTransaction.data,
			validator: "validatorPublicKey",
		});

		spyDispatch.reset();
		const unvoteVoteTransaction = getTransaction(["voteValidatorPublicKey"], ["unvoteValidatorPublicKey"]);
		handler.emitEvents(
			unvoteVoteTransaction as Contracts.Crypto.Transaction,
			emitter as Contracts.Kernel.EventDispatcher,
		);

		spyDispatch.calledTimes(2);
		spyDispatch.calledWith(AppEnums.VoteEvent.Unvote, {
			transaction: unvoteVoteTransaction.data,
			validator: "unvoteValidatorPublicKey",
		});
		spyDispatch.calledWith(AppEnums.VoteEvent.Vote, {
			transaction: unvoteVoteTransaction.data,
			validator: "voteValidatorPublicKey",
		});
	});

	it("throwIfCannotEnterPool - should pass", async ({ handler, poolQuery, walletRepository }) => {
		const spyHas = stub(poolQuery, "has").returnValue(false);

		await assert.resolves(() =>
			handler.throwIfCannotEnterPool(
				walletRepository,
				getTransaction(["validatorPublicKey"], []) as Contracts.Crypto.Transaction,
			),
		);

		spyHas.calledOnce();
	});

	it("throwIfCannotEnterPool - should throw", async ({ handler, poolQuery, walletRepository }) => {
		const spyHas = stub(poolQuery, "has").returnValue(true);

		await assert.rejects(
			() =>
				handler.throwIfCannotEnterPool(
					walletRepository,
					getTransaction(["validatorPublicKey"], []) as Contracts.Crypto.Transaction,
				),
			Exceptions.PoolError,
		);

		spyHas.calledOnce();
	});

	it("applyToSender - should set attribute on vote", async ({ handler, walletRepository }) => {
		stub(walletRepository, "findByPublicKey").resolvedValue(wallet);
		const spySuper = stub(Handlers.TransactionHandler.prototype, "applyToSender");

		await assert.resolves(() =>
			handler.applyToSender(
				walletRepository,
				getTransaction(["validatorPublicKey"], []) as Contracts.Crypto.Transaction,
			),
		);

		spySuper.calledOnce();
		spySetAttribute.calledOnce();
		spySetAttribute.calledWith("vote", "validatorPublicKey");
	});

	it("applyToSender - should forget attribute on unvote", async ({ handler, walletRepository }) => {
		stub(walletRepository, "findByPublicKey").resolvedValue(wallet);
		const spySuper = stub(Handlers.TransactionHandler.prototype, "applyToSender");

		await assert.resolves(() =>
			handler.applyToSender(
				walletRepository,
				getTransaction([], ["validatorPublicKey"]) as Contracts.Crypto.Transaction,
			),
		);

		spySuper.calledOnce();
		spyForgetAttribute.calledOnce();
		spyForgetAttribute.calledWith("vote");
	});

	it("applyToSender - should forget attribute on unvote", async ({ handler, walletRepository }) => {
		stub(walletRepository, "findByPublicKey").resolvedValue(wallet);
		const spySuper = stub(Handlers.TransactionHandler.prototype, "applyToSender");

		await assert.resolves(() =>
			handler.applyToSender(
				walletRepository,
				getTransaction(["validatorPublicKey"], ["secondValidatorPublicKey"]) as Contracts.Crypto.Transaction,
			),
		);

		spySuper.calledOnce();
		spyForgetAttribute.calledOnce();
		spyForgetAttribute.calledWith("vote");
		spySetAttribute.calledWith("vote", "validatorPublicKey");
	});

	it("applyToRecipient - should pass", async ({ handler, walletRepository }) => {
		await assert.resolves(() =>
			handler.applyToRecipient(
				walletRepository,
				getTransaction(["validatorPublicKey"], []) as Contracts.Crypto.Transaction,
			),
		);
	});
});
