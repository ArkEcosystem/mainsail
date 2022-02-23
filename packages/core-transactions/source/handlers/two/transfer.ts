import { Container, Contracts, Utils } from "@arkecosystem/core-kernel";
import { Transactions } from "@arkecosystem/crypto";

import { TransferTransactionHandler as One } from "../one/transfer";

@Container.injectable()
export class TransferTransactionHandler extends One {
	public getConstructor(): Transactions.TransactionConstructor {
		return Transactions.Two.TransferTransaction;
	}

	public async bootstrap(): Promise<void> {
		const transactions = await this.transactionRepository.findReceivedTransactions();
		for (const transaction of transactions) {
			const wallet: Contracts.State.Wallet = this.walletRepository.findByAddress(transaction.recipientId);
			wallet.increaseBalance(Utils.BigNumber.make(transaction.amount));
		}
	}
}
