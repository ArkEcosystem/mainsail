import { inject, injectable, optional } from "@mainsail/container";
import { Contracts, Events, Exceptions, Identifiers } from "@mainsail/contracts";
import { TransactionConstructor } from "@mainsail/crypto-transaction";
import { Utils as AppUtils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";
import { BigNumber } from "@mainsail/utils";

import { ValidatorRegistrationTransaction } from "../versions/index.js";

@injectable()
export class ValidatorRegistrationTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.TransactionPool.Query)
	@optional()
	private readonly poolQuery?: Contracts.TransactionPool.Query;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public getConstructor(): TransactionConstructor {
		return ValidatorRegistrationTransaction;
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		const { data }: Contracts.Crypto.Transaction = transaction;

		AppUtils.assert.defined<string>(data.senderPublicKey);
		AppUtils.assert.defined<Contracts.Crypto.TransactionAsset>(data.asset);
		AppUtils.assert.defined<string>(data.asset.validatorPublicKey);

		if (wallet.isValidator()) {
			throw new Exceptions.WalletIsAlreadyValidatorError();
		}

		if (
			context.walletRepository.hasByIndex(Contracts.State.WalletIndexes.Validators, data.asset.validatorPublicKey)
		) {
			throw new Exceptions.ValidatorPublicKeyAlreadyRegisteredError(data.asset.validatorPublicKey);
		}

		return super.throwIfCannotBeApplied(context, transaction, wallet);
	}

	public emitEvents(transaction: Contracts.Crypto.Transaction): void {
		void this.eventDispatcher.dispatch(Events.ValidatorEvent.Registered, transaction.data);
	}

	public async throwIfCannotEnterPool(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		AppUtils.assert.defined<Contracts.TransactionPool.Query>(this.poolQuery);

		const { data }: Contracts.Crypto.Transaction = transaction;

		AppUtils.assert.defined<string>(data.senderPublicKey);
		AppUtils.assert.defined<Contracts.Crypto.TransactionAsset>(data.asset);
		AppUtils.assert.defined<string>(data.asset.validatorPublicKey);

		const hasSender: boolean = await this.poolQuery
			.getAllBySender(data.senderPublicKey)
			.whereKind(transaction)
			.has();

		if (hasSender) {
			throw new Exceptions.PoolError(
				`Sender ${data.senderPublicKey} already has a transaction of type '${Contracts.Crypto.TransactionType.ValidatorRegistration}' in the pool`,
				"ERR_PENDING",
			);
		}

		const validatorPublicKey = data.asset.validatorPublicKey;
		const hasPublicKey: boolean = await this.poolQuery
			.getAll()
			.whereKind(transaction)
			.wherePredicate(async (t) => t.data.asset?.validatorPublicKey === validatorPublicKey)
			.has();

		if (hasPublicKey) {
			throw new Exceptions.PoolError(
				`Validator registration for public key "${validatorPublicKey}" already in the pool`,
				"ERR_PENDING",
			);
		}
	}

	public async applyToSender(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<Contracts.Transactions.TransactionApplyResult> {
		const { data }: Contracts.Crypto.Transaction = transaction;

		AppUtils.assert.defined<string>(data.senderPublicKey);
		AppUtils.assert.defined<Contracts.Crypto.TransactionAsset>(data.asset);
		AppUtils.assert.defined<string>(data.asset.validatorPublicKey);

		const result = await super.applyToSender(context, transaction);

		const sender: Contracts.State.Wallet = await context.walletRepository.findByPublicKey(data.senderPublicKey);

		sender.setAttribute<BigNumber>("validatorVoteBalance", BigNumber.ZERO);

		sender.setAttribute("validatorPublicKey", data.asset.validatorPublicKey);
		context.walletRepository.setOnIndex(
			Contracts.State.WalletIndexes.Validators,
			data.asset.validatorPublicKey,
			sender,
		);

		return result;
	}

	public async applyToRecipient(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<Contracts.Transactions.TransactionApplyResult> {
		return super.applyToRecipient(context, transaction);
	}
}
