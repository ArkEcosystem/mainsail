import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import Transactions from "@mainsail/crypto-transaction";
import { Enums as AppEnums, Utils as AppUtils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";
import { BigNumber } from "@mainsail/utils";

import { ValidatorRegistrationTransaction } from "../versions";

@injectable()
export class ValidatorRegistrationTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.TransactionPoolQuery)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return ValidatorRegistrationTransaction;
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

		AppUtils.assert.defined<string>(data.senderPublicKey);
		AppUtils.assert.defined<Contracts.Crypto.TransactionAsset>(data.asset);
		AppUtils.assert.defined<string>(data.asset.validatorPublicKey);

		const sender: Contracts.State.Wallet = await walletRepository.findByPublicKey(data.senderPublicKey);

		if (sender.hasMultiSignature()) {
			throw new Exceptions.NotSupportedForMultiSignatureWalletError();
		}

		if (wallet.isValidator()) {
			throw new Exceptions.WalletIsAlreadyValidatorError();
		}

		if (walletRepository.hasByIndex(Contracts.State.WalletIndexes.Validators, data.asset.validatorPublicKey)) {
			throw new Exceptions.ValidatorPublicKeyAlreadyRegisteredError(data.asset.validatorPublicKey);
		}

		return super.throwIfCannotBeApplied(walletRepository, transaction, wallet);
	}

	public emitEvents(transaction: Contracts.Crypto.Transaction, emitter: Contracts.Kernel.EventDispatcher): void {
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		emitter.dispatch(AppEnums.ValidatorEvent.Registered, transaction.data);
	}

	public async throwIfCannotEnterPool(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
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
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		const { data }: Contracts.Crypto.Transaction = transaction;

		AppUtils.assert.defined<string>(data.senderPublicKey);
		AppUtils.assert.defined<Contracts.Crypto.TransactionAsset>(data.asset);
		AppUtils.assert.defined<string>(data.asset.validatorPublicKey);

		await super.applyToSender(walletRepository, transaction);

		const sender: Contracts.State.Wallet = await walletRepository.findByPublicKey(data.senderPublicKey);

		sender.setAttribute<BigNumber>("validatorVoteBalance", BigNumber.ZERO);

		sender.setAttribute("validatorPublicKey", data.asset.validatorPublicKey);
		walletRepository.setOnIndex(Contracts.State.WalletIndexes.Validators, data.asset.validatorPublicKey, sender);
	}

	public async applyToRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> { }
}
