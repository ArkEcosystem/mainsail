import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Events, Exceptions, Identifiers } from "@mainsail/contracts";
import { Providers, Services } from "@mainsail/kernel";
import { Wallets } from "@mainsail/state";

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

	@inject(Identifiers.Evm.Gas.FeeCalculator)
	protected readonly gasFeeCalculator!: Contracts.Evm.GasFeeCalculator;

	@inject(Identifiers.TransactionPool.ExpirationService)
	private readonly expirationService!: Contracts.TransactionPool.ExpirationService;

	@inject(Identifiers.Services.Trigger.Service)
	private readonly triggers!: Services.Triggers.Triggers;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	#corrupt = false;
	#wallet!: Contracts.State.Wallet;

	public async configure(address: string, legacyAddress?: string): Promise<SenderState> {
		this.#wallet = await this.app.resolve(Wallets.Wallet).init(address, legacyAddress);
		return this;
	}

	public async reset(): Promise<void> {
		this.#wallet = await this.app
			.resolve(Wallets.Wallet)
			.init(this.#wallet.getAddress(), this.#wallet.getLegacyAddress());
	}

	public async apply(transaction: Contracts.Crypto.Transaction): Promise<void> {
		const maxTransactionBytes: number = this.configuration.getRequired<number>("maxTransactionBytes");
		if (transaction.serialized.length > maxTransactionBytes) {
			throw new Exceptions.TransactionExceedsMaximumByteSizeError(transaction, maxTransactionBytes);
		}

		const chainId: number = this.cryptoConfiguration.get("network.chainId");
		if (transaction.data.network && transaction.data.network !== chainId) {
			throw new Exceptions.TransactionFromWrongNetworkError(transaction, chainId);
		}

		if (await this.expirationService.isExpired(transaction)) {
			await this.events.dispatch(Events.TransactionEvent.Expired, transaction.data);

			throw new Exceptions.TransactionHasExpiredError(
				transaction,
				await this.expirationService.getExpirationHeight(transaction),
			);
		}

		const handler: Contracts.Transactions.TransactionHandler =
			await this.handlerRegistry.getActivatedHandlerForData(transaction.data);

		if (
			await this.triggers.call("verifyTransaction", {
				handler,
				transaction,
			})
		) {
			if (this.#corrupt) {
				throw new Exceptions.RetryTransactionError(transaction);
			}

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

			this.#wallet.increaseNonce();
			this.#wallet.decreaseBalance(transaction.data.value.plus(this.gasFeeCalculator.calculate(transaction)));
		} else {
			throw new Exceptions.TransactionFailedToVerifyError(transaction);
		}
	}

	public revert(transaction: Contracts.Crypto.Transaction): void {
		this.#wallet.decreaseNonce();
		this.#wallet.increaseBalance(transaction.data.value.plus(this.gasFeeCalculator.calculate(transaction)));
	}
}
