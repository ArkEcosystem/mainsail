import { injectable } from "@mainsail/container";
import { Contracts, Exceptions } from "@mainsail/contracts";
import { TransactionConstructor } from "@mainsail/crypto-transaction";
import { Utils as AppUtils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";
import { BigNumber } from "@mainsail/utils";

import { MultiPaymentTransaction } from "../versions/index.js";

@injectable()
export class MultiPaymentTransactionHandler extends Handlers.TransactionHandler {
	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public walletAttributes(): ReadonlyArray<{ name: string; type: Contracts.State.AttributeType }> {
		return [];
	}

	public getConstructor(): TransactionConstructor {
		return MultiPaymentTransaction;
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		AppUtils.assert.defined<Contracts.Crypto.MultiPaymentItem[]>(transaction.data.asset?.payments);

		const payments: Contracts.Crypto.MultiPaymentItem[] = transaction.data.asset.payments;
		const totalPaymentsAmount = payments.reduce((a, p) => a.plus(p.amount), BigNumber.ZERO);

		if (!transaction.data.amount.isEqualTo(totalPaymentsAmount)) {
			throw new Exceptions.MultiPaymentAmountMismatchError();
		}

		if (wallet.getBalance().minus(totalPaymentsAmount).minus(transaction.data.fee).isNegative()) {
			throw new Exceptions.InsufficientBalanceError();
		}

		return super.throwIfCannotBeApplied(context, transaction, wallet);
	}

	public async applyToSender(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		await super.applyToSender(context, transaction);

		AppUtils.assert.defined<Contracts.Crypto.MultiPaymentItem[]>(transaction.data.asset?.payments);

		const totalPaymentsAmount = transaction.data.asset.payments.reduce((a, p) => a.plus(p.amount), BigNumber.ZERO);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await context.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		sender.decreaseBalance(totalPaymentsAmount);
	}

	public async applyToRecipient(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		AppUtils.assert.defined<Contracts.Crypto.MultiPaymentItem[]>(transaction.data.asset?.payments);

		for (const payment of transaction.data.asset.payments) {
			const recipient: Contracts.State.Wallet = context.walletRepository.findByAddress(payment.recipientId);

			recipient.increaseBalance(payment.amount);
		}
	}
}
