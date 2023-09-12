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

	public walletAttributes(): ReadonlyArray<string> {
		return ["validatorRank", "validatorRound", "validatorUsername", "validatorVoteBalance"];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return ValidatorRegistrationTransaction;
	}

	public async bootstrap(
		walletRepository: Contracts.State.WalletRepository,
		transactions: Contracts.Crypto.ITransaction[],
	): Promise<void> {
		for (const transaction of this.allTransactions(transactions)) {
			AppUtils.assert.defined<string>(transaction.senderPublicKey);
			AppUtils.assert.defined<string>(transaction.asset?.validator?.username);
			AppUtils.assert.defined<string>(transaction.asset?.validator?.publicKey);

			const wallet = await walletRepository.findByPublicKey(transaction.senderPublicKey);

			wallet.setAttribute<string>("validatorUsername", transaction.asset.validator.username);
			wallet.setAttribute<BigNumber>("validatorVoteBalance", BigNumber.ZERO);

			// TODO: Add this as a wallet attribute
			wallet.setAttribute("validatorConsensusPublicKey", transaction.asset.validator.publicKey);

			walletRepository.index(wallet);
		}
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

		const sender: Contracts.State.Wallet = await walletRepository.findByPublicKey(data.senderPublicKey);

		if (sender.hasMultiSignature()) {
			throw new Exceptions.NotSupportedForMultiSignatureWalletError();
		}

		AppUtils.assert.defined<string>(data.asset?.validator?.username);

		const username: string = data.asset.validator.username;

		if (wallet.isValidator()) {
			throw new Exceptions.WalletIsAlreadyValidatorError();
		}

		if (walletRepository.hasByUsername(username)) {
			throw new Exceptions.WalletUsernameAlreadyRegisteredError(username);
		}

		// TODO: Check publicKey index

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

		AppUtils.assert.defined<string>(transaction.data.asset?.validator?.username);
		const username: string = transaction.data.asset.validator.username;
		const hasUsername: boolean = await this.poolQuery
			.getAll()
			.whereKind(transaction)
			.wherePredicate(async (t) => t.data.asset?.validator?.username === username)
			.has();

		if (hasUsername) {
			throw new Exceptions.PoolError(
				`Validator registration for "${username}" already in the pool`,
				"ERR_PENDING",
			);
		}

		// TODO: Check publicKey index
	}

	public async applyToSender(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
		await super.applyToSender(walletRepository, transaction);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		AppUtils.assert.defined<string>(transaction.data.asset?.validator?.username);
		AppUtils.assert.defined<string>(transaction.data.asset?.validator?.publicKey);

		sender.setAttribute<number>("validatorRound", 0); //TODO: use BigNumber
		sender.setAttribute<string>("validatorUsername", transaction.data.asset.validator.username);
		sender.setAttribute<BigNumber>("validatorVoteBalance", BigNumber.ZERO);

		sender.setAttribute("validatorConsensusPublicKey", transaction.data.asset.validator.publicKey);

		walletRepository.index(sender);
	}

	public async revertForSender(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
		await super.revertForSender(walletRepository, transaction);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		sender.forgetAttribute("validatorRound");
		sender.forgetAttribute("validatorUsername");
		sender.forgetAttribute("validatorVoteBalance");
		sender.forgetAttribute("validatorConsensusPublicKey");

		walletRepository.index(sender);
	}

	public async applyToRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {}

	public async revertForRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {}
}
