import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import Transactions from "@mainsail/crypto-transaction";
import { ValidatorRegistrationTransactionHandler } from "@mainsail/crypto-transaction-validator-registration";
import { Enums as AppEnums, Utils as AppUtils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { UsernameResignationTransaction } from "../versions";

@injectable()
export class UsernameResignationTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.TransactionPoolQuery)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [ValidatorRegistrationTransactionHandler];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return UsernameResignationTransaction;
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		if (!wallet.isValidator()) {
			throw new Exceptions.WalletNotAValidatorError();
		}

		if (wallet.hasAttribute("validatorResigned")) {
			throw new Exceptions.WalletAlreadyResignedError();
		}

		// TODO: use validator count relative to proposed block height
		const requiredValidatorsCount: number = this.configuration.getMilestone().activeValidators;
		const currentValidatorsCount: number = walletRepository
			.allValidators()
			.filter((w) => w.hasAttribute("validatorResigned") === false).length;

		if (currentValidatorsCount - 1 < requiredValidatorsCount) {
			throw new Exceptions.NotEnoughValidatorsError();
		}

		return super.throwIfCannotBeApplied(walletRepository, transaction, wallet);
	}

	public emitEvents(transaction: Contracts.Crypto.ITransaction, emitter: Contracts.Kernel.EventDispatcher): void {
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		emitter.dispatch(AppEnums.ValidatorEvent.Resigned, transaction.data);
	}

	public async throwIfCannotEnterPool(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const hasSender: boolean = await this.poolQuery
			.getAllBySender(transaction.data.senderPublicKey)
			.whereKind(transaction)
			.has();

		if (hasSender) {
			throw new Exceptions.PoolError(
				`Validator resignation for "${transaction.data.senderPublicKey}" already in the pool`,
				"ERR_PENDING",
			);
		}
	}

	public async applyToSender(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
		await super.applyToSender(walletRepository, transaction);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const senderWallet = await walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		senderWallet.setAttribute("validatorResigned", true);
		walletRepository.setOnIndex(
			Contracts.State.WalletIndexes.Resignations,
			senderWallet.getAttribute("validatorPublicKey"),
			senderWallet,
		);
	}

	public async applyToRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
		// tslint:disable-next-line: no-empty
	): Promise<void> {}
}
