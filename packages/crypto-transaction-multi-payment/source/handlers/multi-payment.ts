import { injectable } from "@mainsail/container";
import { Contracts, Exceptions } from "@mainsail/contracts";
import Transactions from "@mainsail/crypto-transaction";
import { Utils as AppUtils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";
import { BigNumber } from "@mainsail/utils";

import { MultiPaymentTransaction } from "../versions";

@injectable()
export class MultiPaymentTransactionHandler extends Handlers.TransactionHandler {
	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public walletAttributes(): ReadonlyArray<{ name: string; type: Contracts.State.AttributeType }> {
		return [];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return MultiPaymentTransaction;
	}

	public async bootstrap(
		walletRepository: Contracts.State.WalletRepository,
		transactions: Contracts.Crypto.ITransaction[],
	): Promise<void> {
		for (const transaction of this.allTransactions(transactions)) {
			AppUtils.assert.defined<string>(transaction.senderPublicKey);
			AppUtils.assert.defined<object>(transaction.asset?.payments);

			const sender: Contracts.State.Wallet = await walletRepository.findByPublicKey(transaction.senderPublicKey);
			for (const payment of transaction.asset.payments) {
				const recipient: Contracts.State.Wallet = walletRepository.findByAddress(payment.recipientId);
				recipient.increaseBalance(payment.amount);
				sender.decreaseBalance(payment.amount);
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
		AppUtils.assert.defined<Contracts.Crypto.IMultiPaymentItem[]>(transaction.data.asset?.payments);

		const payments: Contracts.Crypto.IMultiPaymentItem[] = transaction.data.asset.payments;
		const totalPaymentsAmount = payments.reduce((a, p) => a.plus(p.amount), BigNumber.ZERO);

		if (wallet.getBalance().minus(totalPaymentsAmount).minus(transaction.data.fee).isNegative()) {
			throw new Exceptions.InsufficientBalanceError();
		}

		return super.throwIfCannotBeApplied(walletRepository, transaction, wallet);
	}

	public async applyToSender(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
		await super.applyToSender(walletRepository, transaction);

		AppUtils.assert.defined<Contracts.Crypto.IMultiPaymentItem[]>(transaction.data.asset?.payments);

		const totalPaymentsAmount = transaction.data.asset.payments.reduce((a, p) => a.plus(p.amount), BigNumber.ZERO);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		sender.decreaseBalance(totalPaymentsAmount);
	}

	public async applyToRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
		AppUtils.assert.defined<Contracts.Crypto.IMultiPaymentItem[]>(transaction.data.asset?.payments);

		for (const payment of transaction.data.asset.payments) {
			const recipient: Contracts.State.Wallet = walletRepository.findByAddress(payment.recipientId);

			recipient.increaseBalance(payment.amount);
		}
	}
}
