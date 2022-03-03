import { inject, injectable, tagged } from "@arkecosystem/core-container";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import {
	RetryTransactionError,
	TransactionExceedsMaximumByteSizeError,
	TransactionFailedToApplyError,
	TransactionFailedToVerifyError,
	TransactionFromFutureError,
	TransactionFromWrongNetworkError,
	TransactionHasExpiredError,
} from "@arkecosystem/core-contracts";
import { Enums, Providers, Services } from "@arkecosystem/core-kernel";

@injectable()
export class SenderState implements Contracts.TransactionPool.SenderState {
	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "core-transaction-pool")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.TransactionHandlerRegistry)
	@tagged("state", "copy-on-write")
	private readonly handlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

	@inject(Identifiers.TransactionPoolExpirationService)
	private readonly expirationService!: Contracts.TransactionPool.ExpirationService;

	@inject(Identifiers.TriggerService)
	private readonly triggers!: Services.Triggers.Triggers;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly slots: any;

	private corrupt = false;

	public async apply(transaction: Crypto.ITransaction): Promise<void> {
		const maxTransactionBytes: number = this.configuration.getRequired<number>("maxTransactionBytes");
		if (transaction.serialized.length > maxTransactionBytes) {
			throw new TransactionExceedsMaximumByteSizeError(transaction, maxTransactionBytes);
		}

		const currentNetwork: number = this.configuration.get<number>("network.pubKeyHash");
		if (transaction.data.network && transaction.data.network !== currentNetwork) {
			throw new TransactionFromWrongNetworkError(transaction, currentNetwork);
		}

		const now: number = this.slots.getTime();
		if (transaction.timestamp > now + 3600) {
			const secondsInFuture: number = transaction.timestamp - now;
			throw new TransactionFromFutureError(transaction, secondsInFuture);
		}

		if (await this.expirationService.isExpired(transaction)) {
			this.events.dispatch(Enums.TransactionEvent.Expired, transaction.data);
			const expirationHeight: number = await this.expirationService.getExpirationHeight(transaction);
			throw new TransactionHasExpiredError(transaction, expirationHeight);
		}

		const handler: Contracts.Transactions.ITransactionHandler =
			await this.handlerRegistry.getActivatedHandlerForData(transaction.data);

		if (await this.triggers.call("verifyTransaction", { handler, transaction })) {
			if (this.corrupt) {
				throw new RetryTransactionError(transaction);
			}

			try {
				await this.triggers.call("throwIfCannotEnterPool", { handler, transaction });
				await this.triggers.call("applyTransaction", { handler, transaction });
			} catch (error) {
				throw new TransactionFailedToApplyError(transaction, error);
			}
		} else {
			throw new TransactionFailedToVerifyError(transaction);
		}
	}

	public async revert(transaction: Crypto.ITransaction): Promise<void> {
		try {
			const handler: Contracts.Transactions.ITransactionHandler =
				await this.handlerRegistry.getActivatedHandlerForData(transaction.data);

			await this.triggers.call("revertTransaction", { handler, transaction });
		} catch (error) {
			this.corrupt = true;
			throw error;
		}
	}
}
