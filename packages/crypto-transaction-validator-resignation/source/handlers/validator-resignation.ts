import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { TransactionConstructor } from "@mainsail/crypto-transaction";
import { ValidatorRegistrationTransactionHandler } from "@mainsail/crypto-transaction-validator-registration";
import { Enums as AppEnums, Utils as AppUtils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { ValidatorResignationTransaction } from "../versions/1.js";

@injectable()
export class ValidatorResignationTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.TransactionPool.Query)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [ValidatorRegistrationTransactionHandler];
	}

	public getConstructor(): TransactionConstructor {
		return ValidatorResignationTransaction;
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		if (!wallet.isValidator()) {
			throw new Exceptions.WalletNotAValidatorError();
		}

		if (wallet.hasAttribute("validatorResigned")) {
			throw new Exceptions.WalletAlreadyResignedError();
		}

		const requiredValidatorsCount: number = this.configuration.getMilestone().activeValidators;
		const currentValidatorsCount: number =
			context.walletRepository.sizeOfIndex(Contracts.State.WalletIndexes.Validators) -
			context.walletRepository.sizeOfIndex(Contracts.State.WalletIndexes.Resignations);

		if (currentValidatorsCount - 1 < requiredValidatorsCount) {
			throw new Exceptions.NotEnoughValidatorsError();
		}

		return super.throwIfCannotBeApplied(context, transaction, wallet);
	}

	public emitEvents(transaction: Contracts.Crypto.Transaction, emitter: Contracts.Kernel.EventDispatcher): void {
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		emitter.dispatch(AppEnums.ValidatorEvent.Resigned, transaction.data);
	}

	public async throwIfCannotEnterPool(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
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
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		await super.applyToSender(context, transaction);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const senderWallet = await context.walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		senderWallet.setAttribute("validatorResigned", true);
		context.walletRepository.setOnIndex(
			Contracts.State.WalletIndexes.Resignations,
			senderWallet.getAttribute("validatorPublicKey"),
			senderWallet,
		);
	}

	public async applyToRecipient(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
		// tslint:disable-next-line: no-empty
	): Promise<void> {}
}
