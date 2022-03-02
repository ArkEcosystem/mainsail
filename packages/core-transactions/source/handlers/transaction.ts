import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Repositories } from "@arkecosystem/core-database";
import { Container, Utils as AppUtils } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

import {
	ColdWalletError,
	InsufficientBalanceError,
	InvalidMultiSignaturesError,
	LegacyMultiSignatureError,
	LegacyMultiSignatureRegistrationError,
	MissingMultiSignatureOnSenderError,
	SenderWalletMismatchError,
	UnexpectedNonceError,
	UnsupportedMultiSignatureRegistrationTransactionError,
} from "../errors";

// todo: revisit the implementation, container usage and arguments after core-database rework
@Container.injectable()
export abstract class TransactionHandler {
	@Container.inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@Container.inject(Identifiers.DatabaseBlockRepository)
	protected readonly blockRepository!: Repositories.BlockRepository;

	@Container.inject(Identifiers.DatabaseTransactionRepository)
	protected readonly transactionRepository!: Repositories.TransactionRepository;

	@Container.inject(Identifiers.WalletRepository)
	protected readonly walletRepository!: Contracts.State.WalletRepository;

	@Container.inject(Identifiers.LogService)
	protected readonly logger!: Contracts.Kernel.Logger;

	@Container.inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration: Crypto.IConfiguration;

	@Container.inject(Identifiers.Cryptography.Transaction.Verifier)
	protected readonly verifier: Crypto.ITransactionVerifier;

	public async verify(transaction: Crypto.ITransaction): Promise<boolean> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const senderWallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		if (senderWallet.hasMultiSignature()) {
			transaction.isVerified = await this.verifySignatures(senderWallet, transaction.data);
		}

		return transaction.isVerified;
	}

	public async throwIfCannotBeApplied(
		transaction: Crypto.ITransaction,
		sender: Contracts.State.Wallet,
	): Promise<void> {
		const senderWallet: Contracts.State.Wallet = this.walletRepository.findByAddress(sender.getAddress());

		AppUtils.assert.defined<string>(sender.getPublicKey());

		if (!this.walletRepository.hasByPublicKey(sender.getPublicKey()!) && senderWallet.getBalance().isZero()) {
			throw new ColdWalletError();
		}

		return this.performGenericWalletChecks(transaction, sender);
	}

	public async apply(transaction: Crypto.ITransaction): Promise<void> {
		await this.applyToSender(transaction);
		await this.applyToRecipient(transaction);
	}

	public async revert(transaction: Crypto.ITransaction): Promise<void> {
		await this.revertForSender(transaction);
		await this.revertForRecipient(transaction);
	}

	public async applyToSender(transaction: Crypto.ITransaction): Promise<void> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		const data: Crypto.ITransactionData = transaction.data;

		await this.throwIfCannotBeApplied(transaction, sender);

		if (data.version) {
			this.verifyTransactionNonceApply(sender, transaction);

			AppUtils.assert.defined<BigNumber>(data.nonce);

			sender.setNonce(data.nonce);
		} else {
			sender.increaseNonce();
		}

		const newBalance: BigNumber = sender.getBalance().minus(data.amount).minus(data.fee);

		sender.setBalance(newBalance);
	}

	public async revertForSender(transaction: Crypto.ITransaction): Promise<void> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		const data: Crypto.ITransactionData = transaction.data;

		sender.increaseBalance(data.amount.plus(data.fee));

		// TODO: extract version specific code
		this.verifyTransactionNonceRevert(sender, transaction);

		sender.decreaseNonce();
	}

	public emitEvents(transaction: Crypto.ITransaction, emitter: Contracts.Kernel.EventDispatcher): void {}

	public async throwIfCannotEnterPool(transaction: Crypto.ITransaction): Promise<void> {}

	public async verifySignatures(
		wallet: Contracts.State.Wallet,
		transaction: Crypto.ITransactionData,
		multiSignature?: Crypto.IMultiSignatureAsset,
	): Promise<boolean> {
		return this.verifier.verifySignatures(transaction, multiSignature || wallet.getAttribute("multiSignature"));
	}

	protected async performGenericWalletChecks(
		transaction: Crypto.ITransaction,
		sender: Contracts.State.Wallet,
	): Promise<void> {
		const data: Crypto.ITransactionData = transaction.data;

		this.verifyTransactionNonceApply(sender, transaction);

		if (sender.getBalance().minus(data.amount).minus(data.fee).isNegative()) {
			throw new InsufficientBalanceError();
		}

		if (data.senderPublicKey !== sender.getPublicKey()) {
			throw new SenderWalletMismatchError();
		}

		// Prevent legacy multi signatures from being used
		const isMultiSignatureRegistration: boolean =
			transaction.type === Crypto.TransactionType.MultiSignature &&
			transaction.typeGroup === Crypto.TransactionTypeGroup.Core;
		if (isMultiSignatureRegistration && !this.configuration.getMilestone().aip11) {
			throw new LegacyMultiSignatureRegistrationError();
		}

		if (sender.hasMultiSignature()) {
			AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

			// Ensure the database wallet already has a multi signature, in case we checked a pool wallet.
			const databaseSender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
				transaction.data.senderPublicKey,
			);

			if (!databaseSender.hasMultiSignature()) {
				throw new MissingMultiSignatureOnSenderError();
			}

			if (databaseSender.hasAttribute("multiSignature.legacy")) {
				throw new LegacyMultiSignatureError();
			}

			if (!this.verifySignatures(databaseSender, data, databaseSender.getAttribute("multiSignature"))) {
				throw new InvalidMultiSignaturesError();
			}
		} else if (transaction.data.signatures && !isMultiSignatureRegistration) {
			throw new UnsupportedMultiSignatureRegistrationTransactionError();
		}
	}

	protected verifyTransactionNonceApply(wallet: Contracts.State.Wallet, transaction: Crypto.ITransaction): void {
		const nonce: BigNumber = transaction.data.nonce || BigNumber.ZERO;

		if (!wallet.getNonce().plus(1).isEqualTo(nonce)) {
			throw new UnexpectedNonceError(nonce, wallet, false);
		}
	}

	protected verifyTransactionNonceRevert(wallet: Contracts.State.Wallet, transaction: Crypto.ITransaction): void {
		const nonce: BigNumber = transaction.data.nonce || BigNumber.ZERO;

		if (!wallet.getNonce().isEqualTo(nonce)) {
			throw new UnexpectedNonceError(nonce, wallet, true);
		}
	}

	public abstract getConstructor(): Crypto.TransactionConstructor;

	public abstract dependencies(): ReadonlyArray<TransactionHandlerConstructor>;

	public abstract walletAttributes(): ReadonlyArray<string>;

	public abstract isActivated(): Promise<boolean>;

	public abstract bootstrap(): Promise<void>;

	public abstract applyToRecipient(transaction: Crypto.ITransaction): Promise<void>;

	public abstract revertForRecipient(transaction: Crypto.ITransaction): Promise<void>;
}

export type TransactionHandlerConstructor = new () => TransactionHandler;
