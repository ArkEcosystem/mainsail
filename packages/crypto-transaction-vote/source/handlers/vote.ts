import { inject, injectable, optional } from "@mainsail/container";
import { Contracts, Events, Exceptions, Identifiers } from "@mainsail/contracts";
import { TransactionConstructor } from "@mainsail/crypto-transaction";
import { ValidatorRegistrationTransactionHandler } from "@mainsail/crypto-transaction-validator-registration";
import { Utils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { VoteTransaction } from "../versions/index.js";

@injectable()
export class VoteTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.TransactionPool.Query)
	@optional()
	private readonly poolQuery?: Contracts.TransactionPool.Query;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [ValidatorRegistrationTransactionHandler];
	}

	public walletAttributes(): ReadonlyArray<{ name: string; type: Contracts.State.AttributeType }> {
		return [{ name: "vote", type: Contracts.State.AttributeType.String }];
	}

	public getConstructor(): TransactionConstructor {
		return VoteTransaction;
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		Utils.assert.defined<string[]>(transaction.data.asset?.votes);
		Utils.assert.defined<string[]>(transaction.data.asset?.unvotes);

		this.#checkAsset(transaction.data);

		let walletVote: string | undefined;
		if (wallet.hasAttribute("vote")) {
			walletVote = wallet.getAttribute("vote");
		}

		for (const unvote of transaction.data.asset.unvotes) {
			const validatorWallet: Contracts.State.Wallet = await walletRepository.findByPublicKey(unvote);

			if (!walletVote) {
				throw new Exceptions.NoVoteError();
			} else if (walletVote !== unvote) {
				throw new Exceptions.UnvoteMismatchError();
			}

			if (!validatorWallet.isValidator()) {
				throw new Exceptions.VotedForNonValidatorError(unvote);
			}

			walletVote = undefined;
		}

		for (const vote of transaction.data.asset.votes) {
			const validatorWallet: Contracts.State.Wallet = await walletRepository.findByPublicKey(vote);

			if (walletVote) {
				throw new Exceptions.AlreadyVotedError();
			}

			if (!validatorWallet.isValidator()) {
				throw new Exceptions.VotedForNonValidatorError(vote);
			}

			if (validatorWallet.hasAttribute("validatorResigned")) {
				throw new Exceptions.VotedForResignedValidatorError(vote);
			}
		}

		return super.throwIfCannotBeApplied(walletRepository, transaction, wallet);
	}

	public emitEvents(transaction: Contracts.Crypto.Transaction): void {
		Utils.assert.defined<string[]>(transaction.data.asset?.votes);
		Utils.assert.defined<string[]>(transaction.data.asset?.unvotes);

		for (const unvote of transaction.data.asset.unvotes) {
			void this.eventDispatcher.dispatch(Events.VoteEvent.Unvote, {
				transaction: transaction.data,
				validator: unvote,
			});
		}

		for (const vote of transaction.data.asset.votes) {
			void this.eventDispatcher.dispatch(Events.VoteEvent.Vote, {
				transaction: transaction.data,
				validator: vote,
			});
		}
	}

	public async throwIfCannotEnterPool(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		Utils.assert.defined<Contracts.TransactionPool.Query>(this.poolQuery);
		Utils.assert.defined<string>(transaction.data.senderPublicKey);

		const hasSender: boolean = await this.poolQuery
			.getAllBySender(transaction.data.senderPublicKey)
			.whereKind(transaction)
			.has();

		if (hasSender) {
			throw new Exceptions.PoolError(
				`Sender ${transaction.data.senderPublicKey} already has a transaction of type '${Contracts.Crypto.TransactionType.Vote}' in the pool`,
				"ERR_PENDING",
			);
		}
	}

	public async applyToSender(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		await super.applyToSender(walletRepository, transaction);

		Utils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		Utils.assert.defined<string[]>(transaction.data.asset?.votes);
		Utils.assert.defined<string[]>(transaction.data.asset?.unvotes);

		if (transaction.data.asset.unvotes.length > 0) {
			sender.forgetAttribute("vote");
		}

		for (const vote of transaction.data.asset.votes) {
			sender.setAttribute("vote", vote);
		}
	}

	public async applyToRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {}

	#checkAsset(data: Contracts.Crypto.TransactionData) {
		Utils.assert.defined<Contracts.Crypto.VoteAsset>(data.asset);
		if (data.asset.votes.length > 1) {
			throw new Exceptions.MaxVotesExceeededError();
		}

		if (data.asset.unvotes.length > 1) {
			throw new Exceptions.MaxUnvotesExceeededError();
		}

		if (data.asset.votes.length + data.asset.unvotes.length === 0) {
			throw new Exceptions.EmptyVoteError();
		}
	}
}
