import Hapi from "@hapi/hapi";
import { AbstractController } from "@mainsail/api-common";
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

@injectable()
export class ConfigurationController extends AbstractController {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "transaction-pool-service")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	public async configuration(request: Hapi.Request) {
		return {
			data: {
				core: {
					version: this.app.version(),
				},
				height: this.stateStore.getHeight(),
				transactionPool: {
					maxTransactionAge: this.pluginConfiguration.get("maxTransactionAge"),
					maxTransactionBytes: this.pluginConfiguration.get("maxTransactionBytes"),
					maxTransactionsInPool: this.pluginConfiguration.get("maxTransactionsInPool"),
					maxTransactionsPerRequest: this.pluginConfiguration.get("maxTransactionsPerRequest"),
					maxTransactionsPerSender: this.pluginConfiguration.get("maxTransactionsPerSender"),
				},
			},
		};
	}
}
