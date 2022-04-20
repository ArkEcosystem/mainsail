import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import Transactions from "@arkecosystem/core-crypto-transaction";
import { ValidatorRegistrationTransactionHandler } from "@arkecosystem/core-crypto-transaction-validator-registration";
import { Enums as AppEnums, Utils as AppUtils } from "@arkecosystem/core-kernel";
import { Handlers } from "@arkecosystem/core-transactions";

import { ValidatorResignationTransaction } from "../versions";

@injectable()
export class ValidatorResignationTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.TransactionPoolQuery)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [ValidatorRegistrationTransactionHandler];
	}

	public walletAttributes(): ReadonlyArray<string> {
		return ["validator.resigned"];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return ValidatorResignationTransaction;
	}

	public async bootstrap(transactions: Contracts.Crypto.ITransaction[]): Promise<void> {
		for (const transaction of this.allTransactions(transactions)) {
			AppUtils.assert.defined<string>(transaction.senderPublicKey);

			const wallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
				transaction.senderPublicKey,
			);
			wallet.setAttribute("validator.resigned", true);
			this.walletRepository.index(wallet);
		}
	}
	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		transaction: Contracts.Crypto.ITransaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		if (!wallet.isValidator()) {
			throw new Exceptions.WalletNotAValidatorError();
		}

		if (wallet.hasAttribute("validator.resigned")) {
			throw new Exceptions.WalletAlreadyResignedError();
		}

		const requiredValidatorsCount: number = this.configuration.getMilestone().activeValidators;
		const currentValidatorsCount: number = this.walletRepository
			.allByUsername()
			.filter((w) => w.hasAttribute("validator.resigned") === false).length;

		if (currentValidatorsCount - 1 < requiredValidatorsCount) {
			throw new Exceptions.NotEnoughValidatorsError();
		}

		return super.throwIfCannotBeApplied(transaction, wallet);
	}

	public emitEvents(transaction: Contracts.Crypto.ITransaction, emitter: Contracts.Kernel.EventDispatcher): void {
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		emitter.dispatch(AppEnums.ValidatorEvent.Resigned, transaction.data);
	}

	public async throwIfCannotEnterPool(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const hasSender: boolean = await this.poolQuery
			.getAllBySender(transaction.data.senderPublicKey)
			.whereKind(transaction)
			.has();

		if (hasSender) {
			const wallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
				transaction.data.senderPublicKey,
			);
			throw new Exceptions.PoolError(
				`Validator resignation for "${wallet.getAttribute("validator.username")}" already in the pool`,
				"ERR_PENDING",
			);
		}
	}

	public async applyToSender(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		await super.applyToSender(transaction);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const senderWallet = await this.walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		senderWallet.setAttribute("validator.resigned", true);

		this.walletRepository.index(senderWallet);
	}

	public async revertForSender(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		await super.revertForSender(transaction);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const senderWallet = await this.walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		senderWallet.forgetAttribute("validator.resigned");

		this.walletRepository.index(senderWallet);
	}

	public async applyToRecipient(
		transaction: Contracts.Crypto.ITransaction,
		// tslint:disable-next-line: no-empty
	): Promise<void> {}

	public async revertForRecipient(
		transaction: Contracts.Crypto.ITransaction,
		// tslint:disable-next-line: no-empty
	): Promise<void> {}
}
