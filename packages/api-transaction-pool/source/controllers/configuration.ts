import Hapi from "@hapi/hapi";
import { AbstractController } from "@mainsail/api-common";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class ConfigurationController extends AbstractController {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "transaction-pool-service")
	private readonly pluginConfiguration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	public async configuration(request: Hapi.Request): Promise<object> {
		return {
			data: {
				blockNumber: this.stateStore.getBlockNumber(),
				core: {
					version: this.app.version(),
				},
				transactionPool: {
					maxTransactionAge: this.pluginConfiguration.getRequired<number>("maxTransactionAge"),
					maxTransactionBytes: this.pluginConfiguration.getRequired<number>("maxTransactionBytes"),
					maxTransactionsInPool: this.pluginConfiguration.getRequired<number>("maxTransactionsInPool"),
					maxTransactionsPerRequest:
						this.pluginConfiguration.getRequired<number>("maxTransactionsPerRequest"),
					maxTransactionsPerSender: this.pluginConfiguration.getRequired<number>("maxTransactionsPerSender"),
				},
			},
		};
	}
}
