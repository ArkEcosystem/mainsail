import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

// @TODO revisit the implementation, container usage and arguments after core-database rework
@injectable()
export abstract class TransactionHandler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.WalletRepository)
	protected readonly walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.LogService)
	protected readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	protected readonly verifier: Contracts.Crypto.ITransactionVerifier;

	public async verify(transaction: Contracts.Crypto.ITransaction): Promise<boolean> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const senderWallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		if (senderWallet.hasMultiSignature()) {
			return this.verifySignatures(senderWallet, transaction.data);
		}

		return this.verifier.verifyHash(transaction.data);
	}

	public async throwIfCannotBeApplied(
		transaction: Contracts.Crypto.ITransaction,
		sender: Contracts.State.Wallet,
	): Promise<void> {
		const senderWallet: Contracts.State.Wallet = this.walletRepository.findByAddress(sender.getAddress());

		AppUtils.assert.defined<string>(sender.getPublicKey());

		if (!this.walletRepository.hasByPublicKey(sender.getPublicKey()!) && senderWallet.getBalance().isZero()) {
			throw new Exceptions.ColdWalletError();
		}

		// @TODO: enforce fees here to support dynamic cases

		this.#verifyTransactionNonceApply(sender, transaction);

		if (sender.getBalance().minus(transaction.data.amount).minus(transaction.data.fee).isNegative()) {
			throw new Exceptions.InsufficientBalanceError();
		}

		if (transaction.data.senderPublicKey !== sender.getPublicKey()) {
			throw new Exceptions.SenderWalletMismatchError();
		}

		// Prevent legacy multi signatures from being used
		const isMultiSignatureRegistration: boolean =
			transaction.type === Contracts.Crypto.TransactionType.MultiSignature &&
			transaction.typeGroup === Contracts.Crypto.TransactionTypeGroup.Core;

		if (sender.hasMultiSignature()) {
			AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

			// Ensure the database wallet already has a multi signature, in case we checked a pool wallet.
			const databaseSender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
				transaction.data.senderPublicKey,
			);

			if (!databaseSender.hasMultiSignature()) {
				throw new Exceptions.MissingMultiSignatureOnSenderError();
			}

			if (databaseSender.hasAttribute("multiSignature.legacy")) {
				throw new Exceptions.LegacyMultiSignatureError();
			}

			if (
				!this.verifySignatures(databaseSender, transaction.data, databaseSender.getAttribute("multiSignature"))
			) {
				throw new Exceptions.InvalidMultiSignaturesError();
			}
		} else if (transaction.data.signatures && !isMultiSignatureRegistration) {
			throw new Exceptions.UnsupportedMultiSignatureRegistrationTransactionError();
		}
	}

	public async apply(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		await this.applyToSender(transaction);
		await this.applyToRecipient(transaction);
	}

	public async revert(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		await this.revertForSender(transaction);
		await this.revertForRecipient(transaction);
	}

	public async applyToSender(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		const data: Contracts.Crypto.ITransactionData = transaction.data;

		await this.throwIfCannotBeApplied(transaction, sender);

		if (data.version) {
			this.#verifyTransactionNonceApply(sender, transaction);

			AppUtils.assert.defined<BigNumber>(data.nonce);

			sender.setNonce(data.nonce);
		} else {
			sender.increaseNonce();
		}

		const newBalance: BigNumber = sender.getBalance().minus(data.amount).minus(data.fee);

		sender.setBalance(newBalance);
	}

	public async revertForSender(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		const data: Contracts.Crypto.ITransactionData = transaction.data;

		sender.increaseBalance(data.amount.plus(data.fee));

		this.#verifyTransactionNonceRevert(sender, transaction);

		sender.decreaseNonce();
	}

	public emitEvents(transaction: Contracts.Crypto.ITransaction, emitter: Contracts.Kernel.EventDispatcher): void {}

	public async throwIfCannotEnterPool(transaction: Contracts.Crypto.ITransaction): Promise<void> {}

	public async verifySignatures(
		wallet: Contracts.State.Wallet,
		transaction: Contracts.Crypto.ITransactionData,
		multiSignature?: Contracts.Crypto.IMultiSignatureAsset,
	): Promise<boolean> {
		return this.verifier.verifySignatures(transaction, multiSignature || wallet.getAttribute("multiSignature"));
	}

	#verifyTransactionNonceApply(wallet: Contracts.State.Wallet, transaction: Contracts.Crypto.ITransaction): void {
		const nonce: BigNumber = transaction.data.nonce || BigNumber.ZERO;

		if (!wallet.getNonce().plus(1).isEqualTo(nonce)) {
			throw new Exceptions.UnexpectedNonceError(nonce, wallet, false);
		}
	}

	#verifyTransactionNonceRevert(wallet: Contracts.State.Wallet, transaction: Contracts.Crypto.ITransaction): void {
		const nonce: BigNumber = transaction.data.nonce || BigNumber.ZERO;

		if (!wallet.getNonce().isEqualTo(nonce)) {
			throw new Exceptions.UnexpectedNonceError(nonce, wallet, true);
		}
	}

	protected allTransactions(transactions: Contracts.Crypto.ITransaction[]): Contracts.Crypto.ITransactionData[] {
		return transactions
			.filter(
				({ data }) =>
					data.type === this.getConstructor().type && data.typeGroup === this.getConstructor().typeGroup,
			)
			.map(({ data }) => data);
	}

	public abstract getConstructor(): Contracts.Crypto.TransactionConstructor;

	public abstract dependencies(): ReadonlyArray<TransactionHandlerConstructor>;

	public abstract walletAttributes(): ReadonlyArray<string>;

	public abstract isActivated(): Promise<boolean>;

	public abstract bootstrap(transactions: Contracts.Crypto.ITransaction[]): Promise<void>;

	public abstract applyToRecipient(transaction: Contracts.Crypto.ITransaction): Promise<void>;

	public abstract revertForRecipient(transaction: Contracts.Crypto.ITransaction): Promise<void>;
}

export type TransactionHandlerConstructor = new () => TransactionHandler;
