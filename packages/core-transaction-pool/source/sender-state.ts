import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Container, Enums, Providers, Services } from "@arkecosystem/core-kernel";

import {
	RetryTransactionError,
	TransactionExceedsMaximumByteSizeError,
	TransactionFailedToApplyError,
	TransactionFailedToVerifyError,
	TransactionFromFutureError,
	TransactionFromWrongNetworkError,
	TransactionHasExpiredError,
} from "./errors";

@Container.injectable()
export class SenderState implements Contracts.TransactionPool.SenderState {
	@Container.inject(Identifiers.PluginConfiguration)
	@Container.tagged("plugin", "core-transaction-pool")
	private readonly configuration!: Providers.PluginConfiguration;

	@Container.inject(Identifiers.TransactionHandlerRegistry)
	@Container.tagged("state", "copy-on-write")
	private readonly handlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

	@Container.inject(Identifiers.TransactionPoolExpirationService)
	private readonly expirationService!: Contracts.TransactionPool.ExpirationService;

	@Container.inject(Identifiers.TriggerService)
	private readonly triggers!: Services.Triggers.Triggers;

	@Container.inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@Container.inject(Identifiers.Cryptography.Configuration)
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
