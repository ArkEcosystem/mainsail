import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils as AppUtils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

// @TODO revisit the implementation, container usage and arguments after database rework
@injectable()
export abstract class TransactionHandler implements Contracts.Transactions.TransactionHandler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	protected readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	protected readonly verifier!: Contracts.Crypto.TransactionVerifier;

	public async verify(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<boolean> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const senderWallet: Contracts.State.Wallet = await walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		if (senderWallet.hasMultiSignature()) {
			return this.verifySignatures(senderWallet, transaction.data);
		}

		return this.verifier.verifyHash(transaction.data);
	}

	public async throwIfCannotBeApplied(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
		sender: Contracts.State.Wallet,
	): Promise<void> {
		const senderWallet: Contracts.State.Wallet = walletRepository.findByAddress(sender.getAddress());

		AppUtils.assert.defined<string>(sender.getPublicKey());

		if (!walletRepository.hasByPublicKey(sender.getPublicKey()!) && senderWallet.getBalance().isZero()) {
			throw new Exceptions.ColdWalletError();
		}

		// @TODO: enforce fees here to support dynamic cases

		this.#verifyTransactionNonceApply(sender, transaction);

		if (
			sender.getBalance().minus(transaction.data.amount).minus(transaction.data.fee).isNegative() &&
			this.configuration.getHeight() > 0
		) {
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
			const databaseSender: Contracts.State.Wallet = await walletRepository.findByPublicKey(
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

	public async apply(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		await this.applyToSender(walletRepository, transaction);
		await this.applyToRecipient(walletRepository, transaction);
	}

	public async applyToSender(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		const data: Contracts.Crypto.TransactionData = transaction.data;

		await this.throwIfCannotBeApplied(walletRepository, transaction, sender);

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

	public emitEvents(transaction: Contracts.Crypto.Transaction, emitter: Contracts.Kernel.EventDispatcher): void {}

	public walletAttributes(): ReadonlyArray<{ name: string; type: Contracts.State.AttributeType }> {
		return [];
	}

	public async throwIfCannotEnterPool(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {}

	public async verifySignatures(
		wallet: Contracts.State.Wallet,
		transaction: Contracts.Crypto.TransactionData,
		multiSignature?: Contracts.Crypto.MultiSignatureAsset,
	): Promise<boolean> {
		return this.verifier.verifySignatures(transaction, multiSignature || wallet.getAttribute("multiSignature"));
	}

	#verifyTransactionNonceApply(wallet: Contracts.State.Wallet, transaction: Contracts.Crypto.Transaction): void {
		const nonce: BigNumber = transaction.data.nonce || BigNumber.ZERO;

		if (!wallet.getNonce().plus(1).isEqualTo(nonce)) {
			throw new Exceptions.UnexpectedNonceError(nonce, wallet, false);
		}
	}

	protected allTransactions(transactions: Contracts.Crypto.Transaction[]): Contracts.Crypto.TransactionData[] {
		return transactions
			.filter(
				({ data }) =>
					data.type === this.getConstructor().type && data.typeGroup === this.getConstructor().typeGroup,
			)
			.map(({ data }) => data);
	}

	public abstract getConstructor(): Contracts.Crypto.TransactionConstructor;

	public abstract dependencies(): ReadonlyArray<TransactionHandlerConstructor>;

	public abstract isActivated(): Promise<boolean>;

	public abstract applyToRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void>;
}

export type TransactionHandlerConstructor = new () => TransactionHandler;
