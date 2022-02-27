import Interfaces, { BINDINGS, IConfiguration } from "@arkecosystem/core-crypto-contracts";
import { Container, Contracts, Providers, Utils as AppUtils } from "@arkecosystem/core-kernel";

@Container.injectable()
export class ExpirationService implements Contracts.TransactionPool.ExpirationService {
	@Container.inject(Container.Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@Container.inject(Container.Identifiers.PluginConfiguration)
	@Container.tagged("plugin", "core-transaction-pool")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

	@Container.inject(Container.Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	@Container.inject(BINDINGS.Time.Slots)
	private readonly slots: any;

	public canExpire(transaction: Interfaces.ITransaction): boolean {
		if (transaction.data.version && transaction.data.version >= 2) {
			return !!transaction.data.expiration;
		} else {
			return true;
		}
	}

	public async isExpired(transaction: Interfaces.ITransaction): Promise<boolean> {
		if (this.canExpire(transaction)) {
			return (await this.getExpirationHeight(transaction)) <= this.stateStore.getLastHeight() + 1;
		} else {
			return false;
		}
	}

	public async getExpirationHeight(transaction: Interfaces.ITransaction): Promise<number> {
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
