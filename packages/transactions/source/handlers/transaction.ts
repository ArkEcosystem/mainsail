import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils as AppUtils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

@injectable()
export abstract class TransactionHandler implements Contracts.Transactions.TransactionHandler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	protected readonly verifier!: Contracts.Crypto.TransactionVerifier;

	@inject(Identifiers.Evm.Gas.Limits)
	protected readonly gasLimits!: Contracts.Evm.GasLimits;

	@inject(Identifiers.Services.EventDispatcher.Service)
	protected readonly eventDispatcher!: Contracts.Kernel.EventDispatcher;

	public async verify(transaction: Contracts.Crypto.Transaction): Promise<boolean> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);
		return this.verifier.verifyHash(transaction.data);
	}

	public async throwIfCannotBeApplied(
		transaction: Contracts.Crypto.Transaction,
		sender: Contracts.State.Wallet,
	): Promise<void> {
		// @TODO: enforce fees here to support dynamic cases

		//this.#verifyTransactionNonceApply(sender, transaction);

		//this.verifyTransactionFee(context, transaction, sender);

		if (
			sender.getBalance().minus(transaction.data.amount).minus(transaction.data.fee).isNegative() &&
			this.configuration.getHeight() > 0
		) {
			throw new Exceptions.InsufficientBalanceError();
		}

		// if (transaction.data.senderPublicKey !== sender.getPublicKey()) {
		// 	throw new Exceptions.SenderWalletMismatchError();
		// }
	}

	public emitEvents(transaction: Contracts.Crypto.Transaction): void {}

	public async verifySignatures(
		wallet: Contracts.State.Wallet,
		transaction: Contracts.Crypto.TransactionData,
		multiSignature: Contracts.Crypto.MultiSignatureAsset,
	): Promise<boolean> {
		return this.verifier.verifySignatures(transaction, multiSignature);
	}

	// #verifyTransactionNonceApply(wallet: Contracts.State.Wallet, transaction: Contracts.Crypto.Transaction): void {
	// 	const nonce: BigNumber = transaction.data.nonce || BigNumber.ZERO;

	// 	if (!wallet.getNonce().isEqualTo(nonce)) {
	// 		throw new Exceptions.UnexpectedNonceError(nonce, wallet, false);
	// 	}
	// }

	protected allTransactions(transactions: Contracts.Crypto.Transaction[]): Contracts.Crypto.TransactionData[] {
		return transactions
			.filter(
				({ data }) =>
					data.type === this.getConstructor().type && data.typeGroup === this.getConstructor().typeGroup,
			)
			.map(({ data }) => data);
	}

	protected verifyTransactionFee(transaction: Contracts.Crypto.Transaction, sender: Contracts.State.Wallet): void {
		if (
			sender.getBalance().minus(transaction.data.amount).minus(transaction.data.fee).isNegative() &&
			this.configuration.getHeight() > 0
		) {
			throw new Exceptions.InsufficientBalanceError();
		}
	}

	protected applyFeeToSender(transaction: Contracts.Crypto.Transaction, sender: Contracts.State.Wallet): void {
		const data: Contracts.Crypto.TransactionData = transaction.data;

		const newBalance: BigNumber = sender.getBalance().minus(data.fee);
		sender.setBalance(newBalance);
	}

	public abstract apply(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<Contracts.Transactions.TransactionApplyResult>;

	public abstract getConstructor(): Contracts.Crypto.TransactionConstructor;

	public abstract dependencies(): ReadonlyArray<TransactionHandlerConstructor>;

	public abstract isActivated(): Promise<boolean>;
}

export type TransactionHandlerConstructor = new () => TransactionHandler;
