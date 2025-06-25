import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Providers, Services } from "@mainsail/kernel";
import { Wallets } from "@mainsail/state";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class SenderState implements Contracts.TransactionPool.SenderState {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "transaction-pool-service")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "transaction-pool")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Transaction.Handler.Registry)
	private readonly handlerRegistry!: Contracts.Transactions.TransactionHandlerRegistry;

	@inject(Identifiers.Services.Trigger.Service)
	private readonly triggers!: Services.Triggers.Triggers;

	@inject(Identifiers.BlockchainUtils.FeeCalculator)
	private readonly feeCalculator!: Contracts.BlockchainUtils.FeeCalculator;

	#wallet!: Contracts.State.Wallet;

	public async configure(address: string, legacyAddress?: string): Promise<SenderState> {
		this.#wallet = await this.app.resolve(Wallets.Wallet).init(address, legacyAddress);
		return this;
	}

	public getNonce(): BigNumber {
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
		this.#wallet.decreaseBalance(transaction.data.value.plus(this.feeCalculator.calculate(transaction)));
	}

	public async replace(
		oldTransaction: Contracts.Crypto.Transaction,
		newTransaction: Contracts.Crypto.Transaction,
		currentNonce: BigNumber,
	): Promise<boolean> {
		if (!oldTransaction.data.nonce.isEqualTo(newTransaction.data.nonce)) {
			throw new Error("cannot replace transaction with mismatching nonce");
		}

		const oldTransactionCost = oldTransaction.data.value.plus(this.feeCalculator.calculate(oldTransaction));
		const newTransactionCost = newTransaction.data.value.plus(this.feeCalculator.calculate(newTransaction));

		const availableBalance = this.#wallet.getBalance().plus(oldTransactionCost);
		if (availableBalance.isLessThan(newTransactionCost)) {
			return false;
		}

		const nonceOffset = currentNonce.minus(newTransaction.data.nonce).times(-1);
		await this.#validateTransaction(newTransaction, nonceOffset, oldTransactionCost);

		// Nonce stays the same

		this.#wallet.increaseBalance(oldTransactionCost);
		this.#wallet.decreaseBalance(newTransactionCost);

		return true;
	}

	public revert(transaction: Contracts.Crypto.Transaction): void {
		this.#wallet.decreaseNonce();
		this.#wallet.increaseBalance(transaction.data.value.plus(this.feeCalculator.calculate(transaction)));
	}

	async #validateTransaction(
		transaction: Contracts.Crypto.Transaction,
		nonceOffset = BigNumber.ZERO,
		refund = BigNumber.ZERO,
	): Promise<void> {
		const maxTransactionBytes: number = this.configuration.getRequired<number>("maxTransactionBytes");
		if (transaction.serialized.length > maxTransactionBytes) {
			throw new Exceptions.TransactionExceedsMaximumByteSizeError(transaction, maxTransactionBytes);
		}

		const chainId: number = this.cryptoConfiguration.get("network.chainId");
		if (transaction.data.network && transaction.data.network !== chainId) {
			throw new Exceptions.TransactionFromWrongNetworkError(transaction, chainId);
		}

		if (!this.#wallet.getNonce().plus(nonceOffset).isEqualTo(transaction.data.nonce)) {
			throw new Exceptions.UnexpectedNonceError(transaction.data.nonce, this.#wallet);
		}

		if (
			this.#wallet
				.getBalance()
				.plus(refund)
				.minus(transaction.data.value)
				.minus(this.feeCalculator.calculate(transaction))
				.isNegative()
		) {
			throw new Exceptions.InsufficientBalanceError();
		}

		const handler: Contracts.Transactions.TransactionHandler =
			await this.handlerRegistry.getActivatedHandlerForData(transaction.data);

		if (
			await this.triggers.call("verifyTransaction", {
				handler,
				transaction,
			})
		) {
			try {
				await this.triggers.call("throwIfCannotBeApplied", {
					evm: this.evm,
					handler,
					sender: this.#wallet,
					transaction,
				});
			} catch (error) {
				throw new Exceptions.TransactionFailedToApplyError(transaction, error);
			}
		} else {
			throw new Exceptions.TransactionFailedToVerifyError(transaction);
		}
	}
}
