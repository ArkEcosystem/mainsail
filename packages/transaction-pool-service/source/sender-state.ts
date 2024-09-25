import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Events, Exceptions, Identifiers } from "@mainsail/contracts";
import { Providers, Services } from "@mainsail/kernel";

@injectable()
export class SenderState implements Contracts.TransactionPool.SenderState {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "transaction-pool-service")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Transaction.Handler.Registry)
	private readonly handlerRegistry!: Contracts.Transactions.TransactionHandlerRegistry;

	@inject(Identifiers.TransactionPool.ExpirationService)
	private readonly expirationService!: Contracts.TransactionPool.ExpirationService;

	@inject(Identifiers.Services.Trigger.Service)
	private readonly triggers!: Services.Triggers.Triggers;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	#corrupt = false;

	public async configure(publicKey): Promise<SenderState> {
		return this;
	}

	public async apply(transaction: Contracts.Crypto.Transaction): Promise<void> {
		const maxTransactionBytes: number = this.configuration.getRequired<number>("maxTransactionBytes");
		if (transaction.serialized.length > maxTransactionBytes) {
			throw new Exceptions.TransactionExceedsMaximumByteSizeError(transaction, maxTransactionBytes);
		}

		const currentNetwork: number = this.cryptoConfiguration.get("network.pubKeyHash");
		if (transaction.data.network && transaction.data.network !== currentNetwork) {
			throw new Exceptions.TransactionFromWrongNetworkError(transaction, currentNetwork);
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
				await this.triggers.call("applyTransaction", {
					handler,
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
