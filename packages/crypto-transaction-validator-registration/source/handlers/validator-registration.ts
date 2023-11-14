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
		transaction: Contracts.Crypto.ITransaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		const { data }: Contracts.Crypto.ITransaction = transaction;

		AppUtils.assert.defined<string>(data.senderPublicKey);
		AppUtils.assert.defined<Contracts.Crypto.ITransactionAsset>(data.asset);
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

	public emitEvents(transaction: Contracts.Crypto.ITransaction, emitter: Contracts.Kernel.EventDispatcher): void {
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		emitter.dispatch(AppEnums.ValidatorEvent.Registered, transaction.data);
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
				`Sender ${transaction.data.senderPublicKey} already has a transaction of type '${Contracts.Crypto.TransactionType.ValidatorRegistration}' in the pool`,
				"ERR_PENDING",
			);
		}

		// AppUtils.assert.defined<string>(transaction.data.asset?.validator?.username);
		// const username: string = transaction.data.asset.validator.username;
		// const hasUsername: boolean = await this.poolQuery
		// 	.getAll()
		// 	.whereKind(transaction)
		// 	.wherePredicate(async (t) => t.data.asset?.validator?.username === username)
		// 	.has();

		// if (hasUsername) {
		// 	throw new Exceptions.PoolError(
		// 		`Validator registration for "${username}" already in the pool`,
		// 		"ERR_PENDING",
		// 	);
		// }

		// TODO: Check publicKey index
	}

	public async applyToSender(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);
		AppUtils.assert.defined<Contracts.Crypto.ITransactionAsset>(transaction.data.asset);
		AppUtils.assert.defined<string>(transaction.data.asset.validatorPublicKey);

		await super.applyToSender(walletRepository, transaction);

		const sender: Contracts.State.Wallet = await walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		// sender.setAttribute<string>("validatorUsername", transaction.data.asset.validator.username);
		sender.setAttribute<BigNumber>("validatorVoteBalance", BigNumber.ZERO);

		sender.setAttribute("validatorConsensusPublicKey", transaction.data.asset.validatorPublicKey);
		walletRepository.setOnIndex(
			Contracts.State.WalletIndexes.Validators,
			transaction.data.asset.validatorPublicKey,
			sender,
		);
		// walletRepository.setOnIndex(
		// 	Contracts.State.WalletIndexes.Usernames,
		// 	transaction.data.asset.validator.username,
		// 	sender,
		// );
	}

	public async applyToRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {}
}
