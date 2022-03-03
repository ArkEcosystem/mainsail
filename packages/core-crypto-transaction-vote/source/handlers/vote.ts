import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import Transactions from "@arkecosystem/core-crypto-transaction";
import { ValidatorRegistrationTransactionHandler } from "@arkecosystem/core-crypto-transaction-validator-registration";
import { Enums as AppEnums, Utils } from "@arkecosystem/core-kernel";
import { Handlers } from "@arkecosystem/core-transactions";

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
		return [ValidatorRegistrationTransactionHandler];
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
						throw new Exceptions.AlreadyVotedError();
					}

					wallet.setAttribute("vote", vote.slice(1));
				} else {
					if (!hasVoted) {
						throw new Exceptions.NoVoteError();
					} else if (wallet.getAttribute("vote") !== vote.slice(1)) {
						throw new Exceptions.UnvoteMismatchError();
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
		transaction: Contracts.Crypto.ITransaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		Utils.assert.defined<string[]>(transaction.data.asset?.votes);

		let walletVote: string | undefined;
		if (wallet.hasAttribute("vote")) {
			walletVote = wallet.getAttribute("vote");
		}

		for (const vote of transaction.data.asset.votes) {
			const validatorPublicKey: string = vote.slice(1);
			const validatorWallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
				validatorPublicKey,
			);

			if (vote.startsWith("+")) {
				if (walletVote) {
					throw new Exceptions.AlreadyVotedError();
				}

				if (validatorWallet.hasAttribute("validator.resigned")) {
					throw new Exceptions.VotedForResignedValidatorError(vote);
				}

				walletVote = vote.slice(1);
			} else {
				if (!walletVote) {
					throw new Exceptions.NoVoteError();
				} else if (walletVote !== vote.slice(1)) {
					throw new Exceptions.UnvoteMismatchError();
				}

				walletVote = undefined;
			}

			if (!validatorWallet.isValidator()) {
				throw new Exceptions.VotedForNonValidatorError(vote);
			}
		}

		return super.throwIfCannotBeApplied(transaction, wallet);
	}

	public emitEvents(transaction: Contracts.Crypto.ITransaction, emitter: Contracts.Kernel.EventDispatcher): void {
		Utils.assert.defined<string[]>(transaction.data.asset?.votes);

		for (const vote of transaction.data.asset.votes) {
			emitter.dispatch(vote.startsWith("+") ? AppEnums.VoteEvent.Vote : AppEnums.VoteEvent.Unvote, {
				transaction: transaction.data,
				validator: vote,
			});
		}
	}

	public async throwIfCannotEnterPool(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		Utils.assert.defined<string>(transaction.data.senderPublicKey);

		const hasSender: boolean = this.poolQuery
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

	public async applyToSender(transaction: Contracts.Crypto.ITransaction): Promise<void> {
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

	public async revertForSender(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		await super.revertForSender(transaction);

		Utils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		Utils.assert.defined<Contracts.Crypto.ITransactionAsset>(transaction.data.asset?.votes);

		for (const vote of [...transaction.data.asset.votes].reverse()) {
			if (vote.startsWith("+")) {
				sender.forgetAttribute("vote");
			} else {
				sender.setAttribute("vote", vote.slice(1));
			}
		}
	}

	public async applyToRecipient(transaction: Contracts.Crypto.ITransaction): Promise<void> {}

	public async revertForRecipient(transaction: Contracts.Crypto.ITransaction): Promise<void> {}
}
