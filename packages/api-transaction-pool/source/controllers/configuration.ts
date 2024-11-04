import Hapi from "@hapi/hapi";
import { AbstractController } from "@mainsail/api-common";
import { inject, injectable, tagged } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

@injectable()
export class ConfigurationController extends AbstractController {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "transaction-pool-service")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

	public async configuration(request: Hapi.Request) {
		// const configuration = await this.getConfiguration();

		// const cryptoConfiguration = configuration.cryptoConfiguration as Contracts.Crypto.NetworkConfig;
		// const network = cryptoConfiguration.network;

		return {
			data: {
				// constants: configuration.activeMilestones,
				// core: {
				// 	version: configuration.version,
				// },
				// explorer: network.client.explorer,
				// nethash: network.nethash,
				// slip44: network.slip44,
				// symbol: network.client.symbol,
				// token: network.client.token,
				transactionPool: {
					maxTransactionAge: this.pluginConfiguration.get("maxTransactionAge"),
					maxTransactionBytes: this.pluginConfiguration.get("maxTransactionBytes"),
					maxTransactionsInPool: this.pluginConfiguration.get("maxTransactionsInPool"),
					maxTransactionsPerRequest: this.pluginConfiguration.get("maxTransactionsPerRequest"),
					maxTransactionsPerSender: this.pluginConfiguration.get("maxTransactionsPerSender"),
				},
				// version: network.pubKeyHash,
				// wif: network.wif,
			},
		};
	}
}
