import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import Transactions from "@mainsail/crypto-transaction";
import { Utils as AppUtils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { UsernameRegistrationTransaction } from "../versions";

@injectable()
export class UsernameRegistrationTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.TransactionPool.Query)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return UsernameRegistrationTransaction;
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		const { data }: Contracts.Crypto.Transaction = transaction;

		AppUtils.assert.defined<Contracts.Crypto.TransactionAsset>(data.asset);
		AppUtils.assert.defined<string>(data.asset.username);

		if (walletRepository.hasByIndex(Contracts.State.WalletIndexes.Usernames, data.asset.username)) {
			throw new Exceptions.WalletUsernameAlreadyRegisteredError(data.asset.username);
		}

		return super.throwIfCannotBeApplied(walletRepository, transaction, wallet);
	}

	public async throwIfCannotEnterPool(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		const { data }: Contracts.Crypto.Transaction = transaction;

		AppUtils.assert.defined<string>(data.senderPublicKey);
		AppUtils.assert.defined<Contracts.Crypto.TransactionAsset>(data.asset);
		AppUtils.assert.defined<string>(data.asset.username);

		const username = data.asset.username;
		const hasUsername: boolean = await this.poolQuery
			.getAll()
			.whereKind(transaction)
			.wherePredicate(async (t) => t.data.asset?.username === username)
			.has();

		if (hasUsername) {
			throw new Exceptions.PoolError(
				`Username registration for public key "${username}" already in the pool`,
				"ERR_PENDING",
			);
		}
	}

	public async applyToSender(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		const { data }: Contracts.Crypto.Transaction = transaction;

		AppUtils.assert.defined<Contracts.Crypto.TransactionAsset>(data.asset);
		AppUtils.assert.defined<string>(data.asset.username);

		await super.applyToSender(walletRepository, transaction);

		const sender: Contracts.State.Wallet = await walletRepository.findByPublicKey(data.senderPublicKey);

		if (sender.hasAttribute("username")) {
			walletRepository.forgetOnIndex(Contracts.State.WalletIndexes.Usernames, sender.getAttribute("username"));
		}

		sender.setAttribute("username", data.asset.username);
		walletRepository.setOnIndex(Contracts.State.WalletIndexes.Usernames, data.asset.username, sender);
	}

	public async applyToRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {}
}
