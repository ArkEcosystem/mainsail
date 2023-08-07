import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Enums, Providers, Services } from "@mainsail/kernel";

@injectable()
export class SenderState implements Contracts.TransactionPool.SenderState {
	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "transaction-pool")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.TransactionHandlerRegistry)
	private readonly handlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

	@inject(Identifiers.WalletRepository)
	@tagged("state", "copy-on-write")
	private walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.TransactionPoolExpirationService)
	private readonly expirationService!: Contracts.TransactionPool.ExpirationService;

	@inject(Identifiers.TriggerService)
	private readonly triggers!: Services.Triggers.Triggers;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	#corrupt = false;

	public async apply(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		const maxTransactionBytes: number = this.configuration.getRequired<number>("maxTransactionBytes");
		if (transaction.serialized.length > maxTransactionBytes) {
			throw new Exceptions.TransactionExceedsMaximumByteSizeError(transaction, maxTransactionBytes);
		}

		const currentNetwork: number = this.cryptoConfiguration.get("network.pubKeyHash");
		if (transaction.data.network && transaction.data.network !== currentNetwork) {
			throw new Exceptions.TransactionFromWrongNetworkError(transaction, currentNetwork);
		}

		if (await this.expirationService.isExpired(transaction)) {
			await this.events.dispatch(Enums.TransactionEvent.Expired, transaction.data);

			throw new Exceptions.TransactionHasExpiredError(
				transaction,
				await this.expirationService.getExpirationHeight(transaction),
			);
		}

		const handler: Contracts.Transactions.ITransactionHandler =
			await this.handlerRegistry.getActivatedHandlerForData(transaction.data);

		if (
			await this.triggers.call("verifyTransaction", {
				handler,
				transaction,
				walletRepository: this.walletRepository,
			})
		) {
			if (this.#corrupt) {
				throw new Exceptions.RetryTransactionError(transaction);
			}

			try {
				await this.triggers.call("throwIfCannotEnterPool", {
					handler,
					transaction,
					walletRepository: this.walletRepository,
				});
				await this.triggers.call("applyTransaction", {
					handler,
					transaction,
					walletRepository: this.walletRepository,
				});
			} catch (error) {
				throw new Exceptions.TransactionFailedToApplyError(transaction, error);
			}
		} else {
			throw new Exceptions.TransactionFailedToVerifyError(transaction);
		}
	}

	public async revert(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		try {
			const handler: Contracts.Transactions.ITransactionHandler =
				await this.handlerRegistry.getActivatedHandlerForData(transaction.data);

			await this.triggers.call("revertTransaction", {
				handler,
				transaction,
				walletRepository: this.walletRepository,
			});
		} catch (error) {
			this.#corrupt = true;
			throw error;
		}
	}
}
