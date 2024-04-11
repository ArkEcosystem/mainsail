import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { TransactionConstructor } from "@mainsail/crypto-transaction";
import { UsernameRegistrationTransactionHandler } from "@mainsail/crypto-transaction-username-registration";
import { Utils as AppUtils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { UsernameResignationTransaction } from "../versions/index.js";

@injectable()
export class UsernameResignationTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.TransactionPool.Query)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [UsernameRegistrationTransactionHandler];
	}

	public getConstructor(): TransactionConstructor {
		return UsernameResignationTransaction;
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		if (!wallet.hasAttribute("username")) {
			throw new Exceptions.WalletUsernameNotRegisteredError();
		}

		return super.throwIfCannotBeApplied(context, transaction, wallet);
	}

	public async throwIfCannotEnterPool(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		const { data }: Contracts.Crypto.Transaction = transaction;

		AppUtils.assert.defined<string>(data.senderPublicKey);

		const hasSender: boolean = await this.poolQuery
			.getAllBySender(data.senderPublicKey)
			.whereKind(transaction)
			.has();

		if (hasSender) {
			throw new Exceptions.PoolError(
				`Sender ${data.senderPublicKey} already has a transaction of type '${Contracts.Crypto.TransactionType.UsernameResignation}' in the pool`,
				"ERR_PENDING",
			);
		}
	}

	public async applyToSender(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		await super.applyToSender(context, transaction);

		const senderWallet = await context.walletRepository.findByPublicKey(transaction.data.senderPublicKey);
		context.walletRepository.forgetOnIndex(
			Contracts.State.WalletIndexes.Usernames,
			senderWallet.getAttribute("username"),
		);

		senderWallet.forgetAttribute("username");
	}

	public async applyToRecipient(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
		// tslint:disable-next-line: no-empty
	): Promise<void> {}
}
