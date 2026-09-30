import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import dayjs from "dayjs";

import { Controller } from "./controller.js";

@injectable()
export class NodeController extends Controller {
	@inject(ApiDatabaseIdentifiers.PluginRepositoryFactory)
	private readonly pluginRepositoryFactory!: ApiDatabaseContracts.PluginRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.TransactionRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.PeerRepositoryFactory)
	private readonly peerRepositoryFactory!: ApiDatabaseContracts.PeerRepositoryFactory;

	public async status(request: Types.HapiRequest): Promise<object> {
		const state = await this.getState();
		const peerBlockNumber = await this.peerRepositoryFactory().getPeerBlockNumberP90();
		const ownBlockNumber = Number(state?.blockNumber ?? 0);

		return {
			data: {
				blocksCount: state ? peerBlockNumber - ownBlockNumber : 0,
				now: ownBlockNumber,
				synced: ownBlockNumber >= peerBlockNumber - 1,
				timestamp: dayjs().unix(),
			},
		};
	}

	public async syncing(request: Types.HapiRequest): Promise<object> {
		const state = await this.getState();
		const peerBlockNumber = await this.peerRepositoryFactory().getPeerBlockNumberP90();
		const ownBlockNumber = Number(state?.blockNumber ?? 0);

		return {
			data: {
				blockNumber: ownBlockNumber,
				blocks: state ? peerBlockNumber - ownBlockNumber : 0,
				id: state?.id ?? 0,
				syncing: ownBlockNumber < peerBlockNumber - 1,
			},
		};
	}

	public async fees(request: Types.HapiRequest): Promise<object> {
		const configuration = await this.getConfiguration();
		const cryptoConfiguration = configuration.cryptoConfiguration as Contracts.Crypto.NetworkConfig | undefined;

		// A fresh database has no configuration row (and no transactions yet).
		const result = cryptoConfiguration
			? await this.transactionRepositoryFactory().getFeeStatistics(
					cryptoConfiguration.genesisBlock.block.timestamp,
					request.query.days,
				)
			: undefined;

		const grouped = {
			evmCall: {
				avg: result?.avg ?? "0",
				max: result?.max ?? "0",
				min: result?.min ?? "0",
				sum: result?.sum ?? "0",
			},
		};

		return { data: grouped, meta: { days: request.query.days } };
	}

	public async configuration(request: Types.HapiRequest): Promise<object> {
		const configuration = await this.getConfiguration();

		const cryptoConfiguration = configuration.cryptoConfiguration as Contracts.Crypto.NetworkConfig | undefined;
		if (!cryptoConfiguration) {
			// A fresh database has no configuration row yet.
			return { data: {} };
		}

		const plugins = await this.getPlugins();
		const network = cryptoConfiguration.network;

		return {
			data: {
				constants: configuration.activeMilestones,
				core: {
					version: configuration.version,
				},
				explorer: network.client.explorer,
				nethash: network.nethash,
				ports: this.buildPortMapping(plugins),
				symbol: network.client.symbol,
				token: network.client.token,
				version: network.pubKeyHash,
				wif: network.wif,
			},
		};
	}

	public async configurationCrypto(request: Types.HapiRequest): Promise<object> {
		const configuration = await this.getConfiguration();
		return {
			data: configuration?.cryptoConfiguration ?? {},
		};
	}

	private buildPortMapping(plugins: Record<string, Models.Plugin>) {
		const result = {};
		const keys = ["@mainsail/p2p", "@mainsail/api-http", "@mainsail/api-database", "@mainsail/webhooks"];

		for (const key of keys) {
			if (plugins[key] && plugins[key].configuration.enabled) {
				const { configuration } = plugins[key] as unknown as {
					configuration: { port: string; server: { enabled: boolean; port: string } };
				};

				if (configuration.server && configuration.server.enabled) {
					result[key] = +configuration.server.port;
					continue;
				}

				result[key] = +configuration.port;
			}
		}

		return result;
	}

	private async getPlugins(): Promise<Record<string, Models.Plugin>> {
		const pluginRepository = this.pluginRepositoryFactory();

		let plugins = await pluginRepository.createQueryBuilder().select().getMany();

		// Report this API's own port: lift enabled/port out of the server section
		// (http preferred, https otherwise) into the shape buildPortMapping expects.
		// Appended last so the live configuration wins over the raw configuration
		// row that api-sync stores for this package, which carries no top-level port.
		const { server } = this.apiConfiguration.all() as {
			server: { http: { enabled: boolean; port: number }; https: { enabled: boolean; port: number } };
		};
		const activeServer = server.http.enabled ? server.http : server.https;
		plugins = [
			...plugins,
			{
				configuration: { enabled: activeServer.enabled, port: activeServer.port },
				name: "@mainsail/api-http",
			} as Models.Plugin,
		];

		const mappings: Record<string, Models.Plugin> = {};

		for (const plugin of plugins) {
			mappings[plugin.name] = plugin;
		}

		return mappings;
	}
}
