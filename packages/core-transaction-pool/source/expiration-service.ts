import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Container, Providers, Utils as AppUtils } from "@arkecosystem/core-kernel";

@Container.injectable()
export class ExpirationService implements Contracts.TransactionPool.ExpirationService {
	@Container.inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@Container.inject(Identifiers.PluginConfiguration)
	@Container.tagged("plugin", "core-transaction-pool")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

	@Container.inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@Container.inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Crypto.IConfiguration;

	@Container.inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots: any;

	public canExpire(transaction: Crypto.ITransaction): boolean {
		if (transaction.data.version && transaction.data.version >= 2) {
			return !!transaction.data.expiration;
		} else {
			return true;
		}
	}

	public async isExpired(transaction: Crypto.ITransaction): Promise<boolean> {
		if (this.canExpire(transaction)) {
			return (await this.getExpirationHeight(transaction)) <= this.stateStore.getLastHeight() + 1;
		} else {
			return false;
		}
	}

	public async getExpirationHeight(transaction: Crypto.ITransaction): Promise<number> {
		if (transaction.data.version && transaction.data.version >= 2) {
			AppUtils.assert.defined<number>(transaction.data.expiration);
			return transaction.data.expiration;
		} else {
			// ! dynamic block time wasn't available during v1 times
			const currentHeight: number = this.stateStore.getLastHeight();
			const blockTimeLookup = await AppUtils.forgingInfoCalculator.getBlockTimeLookup(
				this.app,
				currentHeight,
				this.configuration,
			);

			const createdSecondsAgo: number = this.slots.getTime() - transaction.data.timestamp;
			const createdBlocksAgo: number = this.slots.getSlotNumber(blockTimeLookup, createdSecondsAgo);
			const maxTransactionAge: number = this.pluginConfiguration.getRequired<number>("maxTransactionAge");

			return Math.floor(currentHeight - createdBlocksAgo + maxTransactionAge);
		}
	}
}
