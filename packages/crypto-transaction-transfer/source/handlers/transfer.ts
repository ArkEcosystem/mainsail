import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { TransactionConstructor } from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";
import { BigNumber } from "@mainsail/utils";

import { TransferTransaction } from "../versions/index.js";

@injectable()
export class TransferTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public walletAttributes(): ReadonlyArray<{ name: string; type: Contracts.State.AttributeType }> {
		return [];
	}

	public getConstructor(): TransactionConstructor {
		return TransferTransaction;
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
		sender: Contracts.State.Wallet,
	): Promise<void> {
		return super.throwIfCannotBeApplied(walletRepository, transaction, sender);
	}

	public hasVendorField(): boolean {
		return true;
	}

	public async throwIfCannotEnterPool(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
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

	public async applyToSender(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		await super.applyToSender(walletRepository, transaction);

		const sender: Contracts.State.Wallet = await walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		const data: Contracts.Crypto.TransactionData = transaction.data;

		const newBalance: BigNumber = sender.getBalance().minus(data.amount);
		sender.setBalance(newBalance);
	}

	public async applyToRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		Utils.assert.defined<string>(transaction.data.recipientId);

		const recipient: Contracts.State.Wallet = walletRepository.findByAddress(transaction.data.recipientId);

		recipient.increaseBalance(transaction.data.amount);
	}
}
