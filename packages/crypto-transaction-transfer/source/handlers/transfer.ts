import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import Transactions from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";
import { BigNumber } from "@mainsail/utils";

import { TransferTransaction } from "../versions";

@injectable()
export class TransferTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	private readonly addressFactory!: Contracts.Crypto.IAddressFactory;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public walletAttributes(): ReadonlyArray<{ name: string; type: Contracts.State.AttributeType }> {
		return [];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return TransferTransaction;
	}

	public async bootstrap(
		walletRepository: Contracts.State.WalletRepository,
		transactions: Contracts.Crypto.ITransaction[],
	): Promise<void> {
		for (const transaction of this.allTransactions(transactions)) {
			Utils.assert.defined<string>(transaction.recipientId);
			walletRepository.findByAddress(transaction.recipientId).increaseBalance(BigNumber.make(transaction.amount));
		}
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
		sender: Contracts.State.Wallet,
	): Promise<void> {
		return super.throwIfCannotBeApplied(walletRepository, transaction, sender);
	}

	public hasVendorField(): boolean {
		return true;
	}

	public async throwIfCannotEnterPool(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
		Utils.assert.defined<string>(transaction.data.recipientId);
		const recipientId: string = transaction.data.recipientId;

		if (!(await this.addressFactory.validate(recipientId))) {
			throw new Exceptions.PoolError(
				`Recipient ${recipientId} is not on the same network`,
				"ERR_INVALID_RECIPIENT",
			);
		}
	}

	public async applyToRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
		Utils.assert.defined<string>(transaction.data.recipientId);

		const recipient: Contracts.State.Wallet = walletRepository.findByAddress(transaction.data.recipientId);

		recipient.increaseBalance(transaction.data.amount);
	}

	public async revertForRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
		Utils.assert.defined<string>(transaction.data.recipientId);

		const recipient: Contracts.State.Wallet = walletRepository.findByAddress(transaction.data.recipientId);

		recipient.decreaseBalance(transaction.data.amount);
	}
}
