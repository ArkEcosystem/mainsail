import { inject, injectable, tagged } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Providers, Utils as AppUtils } from "@arkecosystem/core-kernel";

@injectable()
export class ExpirationService implements Contracts.TransactionPool.ExpirationService {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "core-transaction-pool")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots: Contracts.Crypto.Slots;

	public canExpire(transaction: Contracts.Crypto.ITransaction): boolean {
		if (transaction.data.version && transaction.data.version >= 2) {
			return !!transaction.data.expiration;
		} else {
			return true;
		}
	}

	public async isExpired(transaction: Contracts.Crypto.ITransaction): Promise<boolean> {
		if (this.canExpire(transaction)) {
			return (await this.getExpirationHeight(transaction)) <= this.stateStore.getLastHeight() + 1;
		} else {
			return false;
		}
	}

	public async getExpirationHeight(transaction: Contracts.Crypto.ITransaction): Promise<number> {
		if (transaction.data.version && transaction.data.version >= 2) {
			AppUtils.assert.defined<number>(transaction.data.expiration);
			return transaction.data.expiration;
		} else {
			const currentHeight: number = this.stateStore.getLastHeight();

			const createdSecondsAgo: number = this.slots.getTime() - transaction.data.timestamp;
			const createdBlocksAgo: number = await this.slots.getSlotNumber(createdSecondsAgo);
			const maxTransactionAge: number = this.pluginConfiguration.getRequired<number>("maxTransactionAge");

			return Math.floor(currentHeight - createdBlocksAgo + maxTransactionAge);
		}
	}
}
