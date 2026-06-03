import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import {
	InsufficientBalanceError,
	TransactionExceedsMaximumByteSizeError,
	TransactionFailedToApplyError,
	TransactionFailedToVerifyError,
	TransactionFromWrongNetworkError,
	UnexpectedNonceError,
} from "@mainsail/exceptions";
import { Services } from "@mainsail/kernel";
import { Wallets } from "@mainsail/state";
import { ensureError } from "@mainsail/utils";

@injectable()
export class SenderState implements Contracts.TransactionPool.SenderState {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "transaction-pool-service")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "transaction-pool")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Transaction.Handler)
	private readonly transactionHandler!: Contracts.Transactions.TransactionHandler;

	@inject(Identifiers.Services.Trigger.Service)
	private readonly triggers!: Services.Triggers.Triggers;

	@inject(Identifiers.BlockchainUtils.FeeCalculator)
	private readonly feeCalculator!: Contracts.BlockchainUtils.FeeCalculator;

	#wallet!: Contracts.State.Wallet;

	public async configure(address: string, legacyAddress?: string): Promise<SenderState> {
		this.#wallet = await this.app.resolve(Wallets.Wallet).init(address, legacyAddress);
		return this;
	}

	public getNonce(): bigint {
		return this.#wallet.getNonce();
	}

	public async reset(): Promise<void> {
		this.#wallet = await this.app
			.resolve(Wallets.Wallet)
			.init(this.#wallet.getAddress(), this.#wallet.getLegacyAddress());
	}

	public async apply(transaction: Contracts.Crypto.Transaction): Promise<void> {
		await this.#validateTransaction(transaction);

		this.#wallet.increaseNonce();
		this.#wallet.decreaseBalance(transaction.value + this.feeCalculator.calculate(transaction));
	}

	public async replace(
		oldTransaction: Contracts.Crypto.Transaction,
		newTransaction: Contracts.Crypto.Transaction,
		currentNonce: bigint,
	): Promise<boolean> {
		if (oldTransaction.nonce !== newTransaction.nonce) {
			throw new Error("cannot replace transaction with mismatching nonce");
		}

		const oldTransactionCost = oldTransaction.value + this.feeCalculator.calculate(oldTransaction);
		const newTransactionCost = newTransaction.value + this.feeCalculator.calculate(newTransaction);

		const availableBalance = this.#wallet.getBalance() + oldTransactionCost;
		if (availableBalance < newTransactionCost) {
			return false;
		}

		const nonceOffset = (currentNonce - newTransaction.nonce) * -1n;
		await this.#validateTransaction(newTransaction, nonceOffset, oldTransactionCost);

		// Nonce stays the same

		this.#wallet.increaseBalance(oldTransactionCost);
		this.#wallet.decreaseBalance(newTransactionCost);

		return true;
	}

	public revert(transaction: Contracts.Crypto.Transaction): void {
		this.#wallet.decreaseNonce();
		this.#wallet.increaseBalance(transaction.value + this.feeCalculator.calculate(transaction));
	}

	async #validateTransaction(
		transaction: Contracts.Crypto.Transaction,
		nonceOffset: bigint = 0n,
		refund: bigint = 0n,
	): Promise<void> {
		const maxTransactionBytes: number = this.configuration.getRequired<number>("maxTransactionBytes");
		if (transaction.serialized.length > maxTransactionBytes) {
			throw new TransactionExceedsMaximumByteSizeError(transaction, maxTransactionBytes);
		}

		const chainId: number = this.cryptoConfiguration.getNetwork().chainId;
		if (transaction.network && transaction.network !== chainId) {
			throw new TransactionFromWrongNetworkError(transaction, chainId);
		}

		if (this.#wallet.getNonce() + nonceOffset !== transaction.nonce) {
			throw new UnexpectedNonceError(transaction.nonce, this.#wallet);
		}

		if (this.#wallet.getBalance() + refund - transaction.value - this.feeCalculator.calculate(transaction) < 0n) {
			throw new InsufficientBalanceError();
		}

		if (
			await this.triggers.call("verifyTransaction", {
				handler: this.transactionHandler,
				transaction,
			})
		) {
			try {
				await this.triggers.call("throwIfCannotBeApplied", {
					evm: this.evm,
					handler: this.transactionHandler,
					sender: this.#wallet,
					transaction,
				});
			} catch (rawError) {
				const error = ensureError(rawError);
				throw new TransactionFailedToApplyError(transaction, error);
			}
		} else {
			throw new TransactionFailedToVerifyError(transaction);
		}
	}
}
