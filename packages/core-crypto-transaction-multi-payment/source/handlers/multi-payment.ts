import { injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions } from "@arkecosystem/core-contracts";
import Transactions from "@arkecosystem/core-crypto-transaction";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";
import { Handlers } from "@arkecosystem/core-transactions";
import { BigNumber } from "@arkecosystem/utils";

import { MultiPaymentTransaction } from "../versions";

@injectable()
export class MultiPaymentTransactionHandler extends Handlers.TransactionHandler {
	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public walletAttributes(): ReadonlyArray<string> {
		return [];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return MultiPaymentTransaction;
	}

	public async bootstrap(transactions: Contracts.Crypto.ITransaction[]): Promise<void> {
		for (const transaction of this.allTransactions(transactions)) {
			AppUtils.assert.defined<string>(transaction.senderPublicKey);
			AppUtils.assert.defined<object>(transaction.asset?.payments);

			const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
				transaction.senderPublicKey,
			);
			for (const payment of transaction.asset.payments) {
				const recipient: Contracts.State.Wallet = this.walletRepository.findByAddress(payment.recipientId);
				recipient.increaseBalance(payment.amount);
				sender.decreaseBalance(payment.amount);
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
		AppUtils.assert.defined<Contracts.Crypto.IMultiPaymentItem[]>(transaction.data.asset?.payments);

		const payments: Contracts.Crypto.IMultiPaymentItem[] = transaction.data.asset.payments;
		const totalPaymentsAmount = payments.reduce((a, p) => a.plus(p.amount), BigNumber.ZERO);

		if (wallet.getBalance().minus(totalPaymentsAmount).minus(transaction.data.fee).isNegative()) {
			throw new Exceptions.InsufficientBalanceError();
		}

		return super.throwIfCannotBeApplied(transaction, wallet);
	}

	public async applyToSender(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		await super.applyToSender(transaction);

		AppUtils.assert.defined<Contracts.Crypto.IMultiPaymentItem[]>(transaction.data.asset?.payments);

		const totalPaymentsAmount = transaction.data.asset.payments.reduce((a, p) => a.plus(p.amount), BigNumber.ZERO);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		sender.decreaseBalance(totalPaymentsAmount);
	}

	public async revertForSender(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		await super.revertForSender(transaction);

		AppUtils.assert.defined<Contracts.Crypto.IMultiPaymentItem[]>(transaction.data.asset?.payments);

		const totalPaymentsAmount = transaction.data.asset.payments.reduce((a, p) => a.plus(p.amount), BigNumber.ZERO);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		sender.increaseBalance(totalPaymentsAmount);
	}

	public async applyToRecipient(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		AppUtils.assert.defined<Contracts.Crypto.IMultiPaymentItem[]>(transaction.data.asset?.payments);

		for (const payment of transaction.data.asset.payments) {
			const recipient: Contracts.State.Wallet = this.walletRepository.findByAddress(payment.recipientId);

			recipient.increaseBalance(payment.amount);
		}
	}

	public async revertForRecipient(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		AppUtils.assert.defined<Contracts.Crypto.IMultiPaymentItem[]>(transaction.data.asset?.payments);

		for (const payment of transaction.data.asset.payments) {
			const recipient: Contracts.State.Wallet = this.walletRepository.findByAddress(payment.recipientId);

			recipient.decreaseBalance(payment.amount);
		}
	}
}
