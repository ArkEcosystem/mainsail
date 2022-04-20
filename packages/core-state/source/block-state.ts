import { inject, injectable, multiInject } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

// @TODO review the implementation
@injectable()
export class BlockState implements Contracts.State.BlockState {
	@inject(Identifiers.Application)
	public readonly app: Contracts.Kernel.Application;

	@inject(Identifiers.WalletRepository)
	private readonly walletRepository: Contracts.State.WalletRepository;

	@inject(Identifiers.TransactionHandlerRegistry)
	private readonly handlerRegistry: Contracts.Transactions.ITransactionHandlerRegistry;

	@inject(Identifiers.StateStore)
	private readonly state: Contracts.State.StateStore;

	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly addressFactory: Contracts.Crypto.IAddressFactory;

	@multiInject(Identifiers.State.ValidatorMutator)
	private readonly validatorMutators: Contracts.State.ValidatorMutator[];

	public async applyBlock(block: Contracts.Crypto.IBlock): Promise<void> {
		if (block.data.height === 1) {
			await this.#initGenesisForgerWallet(block.data.generatorPublicKey);
		}

		const previousBlock = this.state.getLastBlock();
		const forgerWallet = await this.walletRepository.findByPublicKey(block.data.generatorPublicKey);

		if (!forgerWallet) {
			const message = `Failed to lookup forger '${block.data.generatorPublicKey}' of block '${block.data.id}'.`;
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			this.app.terminate(message);
		}
		const appliedTransactions: Contracts.Crypto.ITransaction[] = [];
		try {
			for (const transaction of block.transactions) {
				await this.applyTransaction(transaction);
				appliedTransactions.push(transaction);
			}
			await this.#applyBlockToForger(forgerWallet, block.data);

			this.state.setLastBlock(block);
		} catch (error) {
			this.logger.error(error.stack);
			this.logger.error("Failed to apply all transactions in block - reverting previous transactions");
			for (const transaction of appliedTransactions.reverse()) {
				await this.revertTransaction(transaction);
			}

			this.state.setLastBlock(previousBlock);

			throw error;
		}
	}

	public async revertBlock(block: Contracts.Crypto.IBlock): Promise<void> {
		const forgerWallet = await this.walletRepository.findByPublicKey(block.data.generatorPublicKey);

		// if (!forgerWallet) {
		//     const msg = `Failed to lookup forger '${block.data.generatorPublicKey}' of block '${block.data.id}'.`;
		//     this.app.terminate(msg);
		// }

		const revertedTransactions: Contracts.Crypto.ITransaction[] = [];
		try {
			await this.#revertBlockFromForger(forgerWallet, block.data);

			for (const transaction of [...block.transactions].reverse()) {
				await this.revertTransaction(transaction);
				revertedTransactions.push(transaction);
			}
		} catch (error) {
			this.logger.error(error.stack);
			this.logger.error("Failed to revert all transactions in block - applying previous transactions");
			for (const transaction of revertedTransactions.reverse()) {
				await this.applyTransaction(transaction);
			}
			throw error;
		}
	}

	public async applyTransaction(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		const transactionHandler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);

		await transactionHandler.apply(transaction);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		let recipient: Contracts.State.Wallet | undefined;
		if (transaction.data.recipientId) {
			AppUtils.assert.defined<string>(transaction.data.recipientId);

			recipient = this.walletRepository.findByAddress(transaction.data.recipientId);
		}

		// @ts-ignore - Apply vote balance updates
		await this.#applyVoteBalances(sender, recipient, transaction.data);
	}

	public async revertTransaction(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		const { data } = transaction;

		const transactionHandler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);

		AppUtils.assert.defined<string>(data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(data.senderPublicKey);

		let recipient: Contracts.State.Wallet | undefined;
		if (transaction.data.recipientId) {
			AppUtils.assert.defined<string>(transaction.data.recipientId);

			recipient = this.walletRepository.findByAddress(transaction.data.recipientId);
		}

		await transactionHandler.revert(transaction);

		// @ts-ignore - Revert vote balance updates
		await this.#revertVoteBalances(sender, recipient, data);
	}

	// WALLETS
	async #applyVoteBalances(
		sender: Contracts.State.Wallet,
		recipient: Contracts.State.Wallet,
		transaction: Contracts.Crypto.ITransactionData,
	): Promise<void> {
		return this.#updateVoteBalances(sender, recipient, transaction, false);
	}

	async #revertVoteBalances(
		sender: Contracts.State.Wallet,
		recipient: Contracts.State.Wallet,
		transaction: Contracts.Crypto.ITransactionData,
	): Promise<void> {
		return this.#updateVoteBalances(sender, recipient, transaction, true);
	}

	async #applyBlockToForger(forgerWallet: Contracts.State.Wallet, blockData: Contracts.Crypto.IBlockData) {
		for (const validatorMutator of this.validatorMutators) {
			await validatorMutator.apply(forgerWallet, blockData);
		}
	}

	async #revertBlockFromForger(forgerWallet: Contracts.State.Wallet, blockData: Contracts.Crypto.IBlockData) {
		for (const validatorMutator of this.validatorMutators) {
			await validatorMutator.revert(forgerWallet, blockData);
		}
	}

	async #updateVoteBalances(
		sender: Contracts.State.Wallet,
		recipient: Contracts.State.Wallet,
		transaction: Contracts.Crypto.ITransactionData,
		revert: boolean,
	): Promise<void> {
		if (
			transaction.type === Contracts.Crypto.TransactionType.Vote &&
			transaction.typeGroup === Contracts.Crypto.TransactionTypeGroup.Core
		) {
			AppUtils.assert.defined<Contracts.Crypto.ITransactionAsset>(transaction.asset?.votes);

			const senderValidatordAmount = sender
				.getBalance()
				// balance already includes reverted fee when #updateVoteBalances is called
				.minus(revert ? transaction.fee : BigNumber.ZERO);

			if (transaction.asset.unvotes.length > 0) {
				const unvote: string = transaction.asset.unvotes[0];
				const validator: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(unvote);

				// unvote also changes vote balance by fee
				const voteBalanceChange: BigNumber = senderValidatordAmount
					.plus(transaction.fee)
					.times(revert ? 1 : -1);

				const voteBalance: BigNumber = validator
					.getAttribute("validator.voteBalance", BigNumber.ZERO)
					.plus(voteBalanceChange);

				validator.setAttribute("validator.voteBalance", voteBalance);
			}

			if (transaction.asset.votes.length > 0) {
				const vote: string = transaction.asset.votes[0];
				const validator: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(vote);

				const voteBalanceChange: BigNumber = senderValidatordAmount.times(revert ? -1 : 1);

				const voteBalance: BigNumber = validator
					.getAttribute("validator.voteBalance", BigNumber.ZERO)
					.plus(voteBalanceChange);

				validator.setAttribute("validator.voteBalance", voteBalance);
			}
		} else {
			// Update vote balance of the sender's validator
			if (sender.hasVoted()) {
				const validator: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
					sender.getAttribute("vote"),
				);

				let amount: BigNumber = transaction.amount;
				if (
					transaction.type === Contracts.Crypto.TransactionType.MultiPayment &&
					transaction.typeGroup === Contracts.Crypto.TransactionTypeGroup.Core
				) {
					AppUtils.assert.defined<Contracts.Crypto.IMultiPaymentItem[]>(transaction.asset?.payments);

					amount = transaction.asset.payments.reduce(
						(previous, current) => previous.plus(current.amount),
						BigNumber.ZERO,
					);
				}

				const total: BigNumber = amount.plus(transaction.fee);

				const voteBalance: BigNumber = validator.getAttribute("validator.voteBalance", BigNumber.ZERO);

				// General case : sender validator vote balance reduced by amount + fees (or increased if revert)
				validator.setAttribute(
					"validator.voteBalance",
					revert ? voteBalance.plus(total) : voteBalance.minus(total),
				);
			}

			if (
				transaction.type === Contracts.Crypto.TransactionType.MultiPayment &&
				transaction.typeGroup === Contracts.Crypto.TransactionTypeGroup.Core
			) {
				AppUtils.assert.defined<Contracts.Crypto.IMultiPaymentItem[]>(transaction.asset?.payments);

				// go through all payments and update recipients validators vote balance
				for (const { recipientId, amount } of transaction.asset.payments) {
					const recipientWallet: Contracts.State.Wallet = this.walletRepository.findByAddress(recipientId);
					if (recipientWallet.hasVoted()) {
						const vote = recipientWallet.getAttribute("vote");
						const validator: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(vote);
						const voteBalance: BigNumber = validator.getAttribute("validator.voteBalance", BigNumber.ZERO);
						validator.setAttribute(
							"validator.voteBalance",
							revert ? voteBalance.minus(amount) : voteBalance.plus(amount),
						);
					}
				}
			}

			// Update vote balance of recipient's validator
			if (recipient && recipient.hasVoted()) {
				const validator: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
					recipient.getAttribute("vote"),
				);
				const voteBalance: BigNumber = validator.getAttribute("validator.voteBalance", BigNumber.ZERO);

				validator.setAttribute(
					"validator.voteBalance",
					revert ? voteBalance.minus(transaction.amount) : voteBalance.plus(transaction.amount),
				);
			}
		}
	}

	async #initGenesisForgerWallet(forgerPublicKey: string) {
		if (this.walletRepository.hasByPublicKey(forgerPublicKey)) {
			return;
		}

		const forgerAddress = await this.addressFactory.fromPublicKey(forgerPublicKey);
		const forgerWallet = this.walletRepository.createWallet(forgerAddress);
		forgerWallet.setPublicKey(forgerPublicKey);
		this.walletRepository.index(forgerWallet);
	}
}
