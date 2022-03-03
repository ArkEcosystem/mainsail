import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";
import { injectable, inject } from "@arkecosystem/core-container";

// todo: review the implementation
@injectable()
export class BlockState implements Contracts.State.BlockState {
	@inject(Identifiers.WalletRepository)
	private walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.TransactionHandlerRegistry)
	private handlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	@inject(Identifiers.LogService)
	private logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly addressFactory: Crypto.IAddressFactory;

	public async applyBlock(block: Crypto.IBlock): Promise<void> {
		if (block.data.height === 1) {
			await this.initGenesisForgerWallet(block.data.generatorPublicKey);
		}

		const previousBlock = this.state.getLastBlock();
		const forgerWallet = await this.walletRepository.findByPublicKey(block.data.generatorPublicKey);

		// if (!forgerWallet) {
		//     const msg = `Failed to lookup forger '${block.data.generatorPublicKey}' of block '${block.data.id}'.`;
		//     this.app.terminate(msg);
		// }
		const appliedTransactions: Crypto.ITransaction[] = [];
		try {
			for (const transaction of block.transactions) {
				await this.applyTransaction(transaction);
				appliedTransactions.push(transaction);
			}
			this.applyBlockToForger(forgerWallet, block.data);

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

	public async revertBlock(block: Crypto.IBlock): Promise<void> {
		const forgerWallet = await this.walletRepository.findByPublicKey(block.data.generatorPublicKey);

		// if (!forgerWallet) {
		//     const msg = `Failed to lookup forger '${block.data.generatorPublicKey}' of block '${block.data.id}'.`;
		//     this.app.terminate(msg);
		// }

		const revertedTransactions: Crypto.ITransaction[] = [];
		try {
			this.revertBlockFromForger(forgerWallet, block.data);

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

	public async applyTransaction(transaction: Crypto.ITransaction): Promise<void> {
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
		await this.applyVoteBalances(sender, recipient, transaction.data);
	}

	public async revertTransaction(transaction: Crypto.ITransaction): Promise<void> {
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
		await this.revertVoteBalances(sender, recipient, data);
	}

	public async increaseWalletValidatorVoteBalance(wallet: Contracts.State.Wallet, amount: BigNumber): Promise<void> {
		// ? packages/core-transactions/source/handlers/one/vote.ts:L120 blindly sets "vote" attribute
		// ? is it guaranteed that validator wallet exists, so validatorWallet.getAttribute("validator.voteBalance") is safe?
		if (wallet.hasVoted()) {
			const validatorPulicKey = wallet.getAttribute<string>("vote");
			const validatorWallet = await this.walletRepository.findByPublicKey(validatorPulicKey);
			const oldValidatorVoteBalance = validatorWallet.getAttribute<BigNumber>("validator.voteBalance");
			const newValidatorVoteBalance = oldValidatorVoteBalance.plus(amount);
			validatorWallet.setAttribute("validator.voteBalance", newValidatorVoteBalance);
		}
	}

	public async decreaseWalletValidatorVoteBalance(wallet: Contracts.State.Wallet, amount: BigNumber): Promise<void> {
		if (wallet.hasVoted()) {
			const validatorPulicKey = wallet.getAttribute<string>("vote");
			const validatorWallet = await this.walletRepository.findByPublicKey(validatorPulicKey);
			const oldValidatorVoteBalance = validatorWallet.getAttribute<BigNumber>("validator.voteBalance");
			const newValidatorVoteBalance = oldValidatorVoteBalance.minus(amount);
			validatorWallet.setAttribute("validator.voteBalance", newValidatorVoteBalance);
		}
	}

	// WALLETS
	private async applyVoteBalances(
		sender: Contracts.State.Wallet,
		recipient: Contracts.State.Wallet,
		transaction: Crypto.ITransactionData,
	): Promise<void> {
		return this.updateVoteBalances(sender, recipient, transaction, false);
	}

	private async revertVoteBalances(
		sender: Contracts.State.Wallet,
		recipient: Contracts.State.Wallet,
		transaction: Crypto.ITransactionData,
	): Promise<void> {
		return this.updateVoteBalances(sender, recipient, transaction, true);
	}

	private applyBlockToForger(forgerWallet: Contracts.State.Wallet, blockData: Crypto.IBlockData) {
		const validatorAttribute = forgerWallet.getAttribute<Contracts.State.WalletValidatorAttributes>("validator");
		validatorAttribute.producedBlocks++;
		validatorAttribute.forgedFees = validatorAttribute.forgedFees.plus(blockData.totalFee);
		validatorAttribute.forgedRewards = validatorAttribute.forgedRewards.plus(blockData.reward);
		validatorAttribute.lastBlock = blockData;

		const balanceIncrease = blockData.reward.plus(blockData.totalFee);
		this.increaseWalletValidatorVoteBalance(forgerWallet, balanceIncrease);
		forgerWallet.increaseBalance(balanceIncrease);
	}

	private revertBlockFromForger(forgerWallet: Contracts.State.Wallet, blockData: Crypto.IBlockData) {
		const validatorAttribute = forgerWallet.getAttribute<Contracts.State.WalletValidatorAttributes>("validator");
		validatorAttribute.producedBlocks--;
		validatorAttribute.forgedFees = validatorAttribute.forgedFees.minus(blockData.totalFee);
		validatorAttribute.forgedRewards = validatorAttribute.forgedRewards.minus(blockData.reward);
		validatorAttribute.lastBlock = undefined;

		const balanceDecrease = blockData.reward.plus(blockData.totalFee);
		this.decreaseWalletValidatorVoteBalance(forgerWallet, balanceDecrease);
		forgerWallet.decreaseBalance(balanceDecrease);
	}

	private async updateVoteBalances(
		sender: Contracts.State.Wallet,
		recipient: Contracts.State.Wallet,
		transaction: Crypto.ITransactionData,
		revert: boolean,
	): Promise<void> {
		if (
			transaction.type === Crypto.TransactionType.Vote &&
			transaction.typeGroup === Crypto.TransactionTypeGroup.Core
		) {
			AppUtils.assert.defined<Crypto.ITransactionAsset>(transaction.asset?.votes);

			const senderValidatordAmount = sender
				.getBalance()
				// balance already includes reverted fee when updateVoteBalances is called
				.minus(revert ? transaction.fee : BigNumber.ZERO);

			for (let index = 0; index < transaction.asset.votes.length; index++) {
				const vote: string = transaction.asset.votes[index];
				const validator: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(vote.slice(1));

				// first unvote also changes vote balance by fee
				const senderVoteValidatordAmount =
					index === 0 && vote.startsWith("-")
						? senderValidatordAmount.plus(transaction.fee)
						: senderValidatordAmount;

				const voteBalanceChange: BigNumber = senderVoteValidatordAmount
					.times(vote.startsWith("-") ? -1 : 1)
					.times(revert ? -1 : 1);

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
					transaction.type === Crypto.TransactionType.MultiPayment &&
					transaction.typeGroup === Crypto.TransactionTypeGroup.Core
				) {
					AppUtils.assert.defined<Crypto.IMultiPaymentItem[]>(transaction.asset?.payments);

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
				transaction.type === Crypto.TransactionType.MultiPayment &&
				transaction.typeGroup === Crypto.TransactionTypeGroup.Core
			) {
				AppUtils.assert.defined<Crypto.IMultiPaymentItem[]>(transaction.asset?.payments);

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

	private async initGenesisForgerWallet(forgerPublicKey: string) {
		if (this.walletRepository.hasByPublicKey(forgerPublicKey)) {
			return;
		}

		const forgerAddress = await this.addressFactory.fromPublicKey(forgerPublicKey);
		const forgerWallet = this.walletRepository.createWallet(forgerAddress);
		forgerWallet.setPublicKey(forgerPublicKey);
		this.walletRepository.index(forgerWallet);
	}
}
