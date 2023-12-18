import { injectable } from "@mainsail/container";
import { Contracts, Exceptions } from "@mainsail/contracts";
import Transactions from "@mainsail/crypto-transaction";
import { UsernameRegistrationTransactionHandler } from "@mainsail/crypto-transaction-username-registration";
import { Handlers } from "@mainsail/transactions";

import { UsernameResignationTransaction } from "../versions";

@injectable()
export class UsernameResignationTransactionHandler extends Handlers.TransactionHandler {
	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [UsernameRegistrationTransactionHandler];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return UsernameResignationTransaction;
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		if (!wallet.hasAttribute("username")) {
			throw new Exceptions.WalletUsernameNotRegisteredError();
		}

		return super.throwIfCannotBeApplied(walletRepository, transaction, wallet);
	}

	public async applyToSender(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		await super.applyToSender(walletRepository, transaction);

		const senderWallet = await walletRepository.findByPublicKey(transaction.data.senderPublicKey);
		walletRepository.forgetOnIndex(Contracts.State.WalletIndexes.Usernames, senderWallet.getAttribute("username"));

		senderWallet.forgetAttribute("username");
	}

	public async applyToRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
		// tslint:disable-next-line: no-empty
	): Promise<void> { }
}
