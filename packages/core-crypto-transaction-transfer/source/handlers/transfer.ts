import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import Transactions from "@arkecosystem/core-crypto-transaction";
import { Utils } from "@arkecosystem/core-kernel";
import { Handlers } from "@arkecosystem/core-transactions";
import { BigNumber } from "@arkecosystem/utils";

import { TransferTransaction } from "../versions";

@injectable()
export class TransferTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	private readonly addressFactory: Contracts.Crypto.IAddressFactory;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public walletAttributes(): ReadonlyArray<string> {
		return [];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return TransferTransaction;
	}

	public async bootstrap(transactions: Contracts.Crypto.ITransaction[]): Promise<void> {
		for (const transaction of this.allTransactions(transactions)) {
			this.walletRepository
				.findByAddress(transaction.recipientId)
				.increaseBalance(BigNumber.make(transaction.amount));
		}
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		transaction: Contracts.Crypto.ITransaction,
		sender: Contracts.State.Wallet,
	): Promise<void> {
		return super.throwIfCannotBeApplied(transaction, sender);
	}

	public hasVendorField(): boolean {
		return true;
	}

	public async throwIfCannotEnterPool(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		Utils.assert.defined<string>(transaction.data.recipientId);
		const recipientId: string = transaction.data.recipientId;

		if (!(await this.addressFactory.validate(recipientId))) {
			throw new Exceptions.PoolError(
				`Recipient ${recipientId} is not on the same network`,
				"ERR_INVALID_RECIPIENT",
			);
		}
	}

	public async applyToRecipient(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		Utils.assert.defined<string>(transaction.data.recipientId);

		const recipient: Contracts.State.Wallet = this.walletRepository.findByAddress(transaction.data.recipientId);

		recipient.increaseBalance(transaction.data.amount);
	}

	public async revertForRecipient(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		Utils.assert.defined<string>(transaction.data.recipientId);

		const recipient: Contracts.State.Wallet = this.walletRepository.findByAddress(transaction.data.recipientId);

		recipient.decreaseBalance(transaction.data.amount);
	}
}
