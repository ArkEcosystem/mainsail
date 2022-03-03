import { inject, injectable } from "@arkecosystem/core-container";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import Transactions from "@arkecosystem/core-crypto-transaction";
import { DelegateRegistrationTransactionHandler } from "@arkecosystem/core-crypto-transaction-delegate-registration";
import { PoolError } from "@arkecosystem/core-contracts";
import { Enums as AppEnums, Utils } from "@arkecosystem/core-kernel";
import { Errors, Handlers } from "@arkecosystem/core-transactions";

import { VoteTransaction } from "../versions";

// todo: revisit the implementation, container usage and arguments after core-database rework
// todo: replace unnecessary function arguments with dependency injection to avoid passing around references
@injectable()
export class VoteTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.TransactionPoolQuery)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	@inject(Identifiers.TransactionHistoryService)
	private readonly transactionHistoryService!: Contracts.Shared.TransactionHistoryService;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [DelegateRegistrationTransactionHandler];
	}

	public walletAttributes(): ReadonlyArray<string> {
		return ["vote"];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return VoteTransaction;
	}

	public async bootstrap(): Promise<void> {
		const criteria = {
			type: this.getConstructor().type,
			typeGroup: this.getConstructor().typeGroup,
		};

		for await (const transaction of this.transactionHistoryService.streamByCriteria(criteria)) {
			Utils.assert.defined<string>(transaction.senderPublicKey);
			Utils.assert.defined<string[]>(transaction.asset?.votes);

			const wallet = await this.walletRepository.findByPublicKey(transaction.senderPublicKey);

			for (const vote of transaction.asset.votes) {
				const hasVoted: boolean = wallet.hasAttribute("vote");

				if (vote.startsWith("+")) {
					if (hasVoted) {
						throw new Errors.AlreadyVotedError();
					}

					wallet.setAttribute("vote", vote.slice(1));
				} else {
					if (!hasVoted) {
						throw new Errors.NoVoteError();
					} else if (wallet.getAttribute("vote") !== vote.slice(1)) {
						throw new Errors.UnvoteMismatchError();
					}

					wallet.forgetAttribute("vote");
				}
			}
		}
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		transaction: Crypto.ITransaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		Utils.assert.defined<string[]>(transaction.data.asset?.votes);

		let walletVote: string | undefined;
		if (wallet.hasAttribute("vote")) {
			walletVote = wallet.getAttribute("vote");
		}

		for (const vote of transaction.data.asset.votes) {
			const delegatePublicKey: string = vote.slice(1);
			const delegateWallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
				delegatePublicKey,
			);

			if (vote.startsWith("+")) {
				if (walletVote) {
					throw new Errors.AlreadyVotedError();
				}

				if (delegateWallet.hasAttribute("delegate.resigned")) {
					throw new Errors.VotedForResignedDelegateError(vote);
				}

				walletVote = vote.slice(1);
			} else {
				if (!walletVote) {
					throw new Errors.NoVoteError();
				} else if (walletVote !== vote.slice(1)) {
					throw new Errors.UnvoteMismatchError();
				}

				walletVote = undefined;
			}

			if (!delegateWallet.isDelegate()) {
				throw new Errors.VotedForNonDelegateError(vote);
			}
		}

		return super.throwIfCannotBeApplied(transaction, wallet);
	}

	public emitEvents(transaction: Crypto.ITransaction, emitter: Contracts.Kernel.EventDispatcher): void {
		Utils.assert.defined<string[]>(transaction.data.asset?.votes);

		for (const vote of transaction.data.asset.votes) {
			emitter.dispatch(vote.startsWith("+") ? AppEnums.VoteEvent.Vote : AppEnums.VoteEvent.Unvote, {
				delegate: vote,
				transaction: transaction.data,
			});
		}
	}

	public async throwIfCannotEnterPool(transaction: Crypto.ITransaction): Promise<void> {
		Utils.assert.defined<string>(transaction.data.senderPublicKey);

		const hasSender: boolean = this.poolQuery
			.getAllBySender(transaction.data.senderPublicKey)
			.whereKind(transaction)
			.has();

		if (hasSender) {
			throw new PoolError(
				`Sender ${transaction.data.senderPublicKey} already has a transaction of type '${Crypto.TransactionType.Vote}' in the pool`,
				"ERR_PENDING",
			);
		}
	}

	public async applyToSender(transaction: Crypto.ITransaction): Promise<void> {
		await super.applyToSender(transaction);

		Utils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		Utils.assert.defined<string[]>(transaction.data.asset?.votes);

		for (const vote of transaction.data.asset.votes) {
			if (vote.startsWith("+")) {
				sender.setAttribute("vote", vote.slice(1));
			} else {
				sender.forgetAttribute("vote");
			}
		}
	}

	public async revertForSender(transaction: Crypto.ITransaction): Promise<void> {
		await super.revertForSender(transaction);

		Utils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		Utils.assert.defined<Crypto.ITransactionAsset>(transaction.data.asset?.votes);

		for (const vote of [...transaction.data.asset.votes].reverse()) {
			if (vote.startsWith("+")) {
				sender.forgetAttribute("vote");
			} else {
				sender.setAttribute("vote", vote.slice(1));
			}
		}
	}

	public async applyToRecipient(transaction: Crypto.ITransaction): Promise<void> {}

	public async revertForRecipient(transaction: Crypto.ITransaction): Promise<void> {}
}
