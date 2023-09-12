import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import Transactions from "@mainsail/crypto-transaction";
import { ValidatorRegistrationTransactionHandler } from "@mainsail/crypto-transaction-validator-registration";
import { Enums as AppEnums, Utils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { VoteTransaction } from "../versions";

@injectable()
export class VoteTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.TransactionPoolQuery)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [ValidatorRegistrationTransactionHandler];
	}

	public walletAttributes(): ReadonlyArray<{ name: string; type: Contracts.State.AttributeType }> {
		return [{ name: "vote", type: Contracts.State.AttributeType.String }];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return VoteTransaction;
	}

	public async bootstrap(
		walletRepository: Contracts.State.WalletRepository,
		transactions: Contracts.Crypto.ITransaction[],
	): Promise<void> {
		for (const transaction of this.allTransactions(transactions)) {
			Utils.assert.defined<string>(transaction.senderPublicKey);
			Utils.assert.defined<string[]>(transaction.asset?.votes);
			Utils.assert.defined<string[]>(transaction.asset?.unvotes);

			this.#checkAsset(transaction);

			const wallet = await walletRepository.findByPublicKey(transaction.senderPublicKey);

			for (const unvote of transaction.asset.unvotes) {
				const hasVoted: boolean = wallet.hasAttribute("vote");

				if (!hasVoted) {
					throw new Exceptions.NoVoteError();
				} else if (wallet.getAttribute("vote") !== unvote) {
					throw new Exceptions.UnvoteMismatchError();
				}

				wallet.forgetAttribute("vote");
			}

			for (const vote of transaction.asset.votes) {
				const hasVoted: boolean = wallet.hasAttribute("vote");

				if (hasVoted) {
					throw new Exceptions.AlreadyVotedError();
				}

				wallet.setAttribute("vote", vote);
			}
		}
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
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

	public emitEvents(transaction: Contracts.Crypto.ITransaction, emitter: Contracts.Kernel.EventDispatcher): void {
		Utils.assert.defined<string[]>(transaction.data.asset?.votes);
		Utils.assert.defined<string[]>(transaction.data.asset?.unvotes);

		for (const unvote of transaction.data.asset.unvotes) {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			emitter.dispatch(AppEnums.VoteEvent.Unvote, {
				transaction: transaction.data,
				validator: unvote,
			});
		}

		for (const vote of transaction.data.asset.votes) {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			emitter.dispatch(AppEnums.VoteEvent.Vote, {
				transaction: transaction.data,
				validator: vote,
			});
		}
	}

	public async throwIfCannotEnterPool(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
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
		transaction: Contracts.Crypto.ITransaction,
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

	public async revertForSender(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
		await super.revertForSender(walletRepository, transaction);

		Utils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		Utils.assert.defined<Contracts.Crypto.ITransactionAsset>(transaction.data.asset?.votes);
		Utils.assert.defined<Contracts.Crypto.ITransactionAsset>(transaction.data.asset?.unvotes);

		if (transaction.data.asset.votes.length > 0) {
			sender.forgetAttribute("vote");
		}

		for (const unvote of transaction.data.asset.unvotes) {
			sender.setAttribute("vote", unvote);
		}
	}

	public async applyToRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {}

	public async revertForRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {}

	#checkAsset(data: Contracts.Crypto.ITransactionData) {
		Utils.assert.defined<Contracts.Crypto.IVoteAsset>(data.asset);
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
