import Hapi from "@hapi/hapi";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import dayjs from "dayjs";

import { Controller } from "./controller";

@injectable()
export class NodeController extends Controller {
	@inject(ApiDatabaseIdentifiers.ConfigurationRepositoryFactory)
	private readonly configurationRepositoryFactory!: ApiDatabaseContracts.IConfigurationRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.PluginRepositoryFactory)
	private readonly pluginRepositoryFactory!: ApiDatabaseContracts.IPluginRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.ITransactionRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TransactionTypeRepositoryFactory)
	private readonly transactionTypeRepositoryFactory!: ApiDatabaseContracts.ITransactionTypeRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.PeerRepositoryFactory)
	private readonly peerRepositoryFactory!: ApiDatabaseContracts.IPeerRepositoryFactory;

	public async status(request: Hapi.Request) {
		const state = await this.getState();

		return {
			data: {
				blocksCount: state ? (await this.peerRepositoryFactory().getMedianPeerHeight()) - +state.height : 0,
				// TODO
				now: state?.height ?? 0,
				synced: false,
				timestamp: dayjs().unix(), // TODO
			},
		};
	}

	public async syncing(request: Hapi.Request) {
		const state = await this.getState();

		return {
			data: {
				// TODO
				blocks: state ? (await this.peerRepositoryFactory().getMedianPeerHeight()) - +state.height : 0,
				height: state?.height ?? 0,
				id: state?.id ?? 0,
				syncing: false,
			},
		};
	}

	public async fees(request: Hapi.Request) {
		const transactionTypes = await this.transactionTypeRepositoryFactory()
			.createQueryBuilder()
			.select()
			.addOrderBy("type", "ASC")
			.addOrderBy("type_group", "ASC")
			.getMany();

		const results = await this.transactionRepositoryFactory().getFeeStatistics(request.query.days);

		const groupedByTypeGroup = {};
		for (const transactionType of transactionTypes) {
			if (!groupedByTypeGroup[transactionType.typeGroup]) {
				groupedByTypeGroup[transactionType.typeGroup] = {};
			}

			const result = results.find(
				({ type, typeGroup }) => type === transactionType.type && typeGroup === transactionType.typeGroup,
			);

			groupedByTypeGroup[transactionType.typeGroup][transactionType.key] = {
				avg: result?.avg ?? "0",
				max: result?.max ?? "0",
				min: result?.min ?? "0",
				sum: result?.sum ?? "0",
			};
		}

		return { data: groupedByTypeGroup, meta: { days: request.query.days } };
	}

	public async configuration(request: Hapi.Request) {
		const configuration = await this.getConfiguration();
		const state = await this.getState();
		const plugins = await this.getPlugins();
		const transactionPoolConfiguration = plugins["@mainsail/transaction-pool"]?.configuration ?? {};

		const cryptoConfiguration = configuration.cryptoConfiguration as Contracts.Crypto.NetworkConfig;
		const network = cryptoConfiguration.network;

		return {
			data: {
				constants: this.getMilestone(+state.height, cryptoConfiguration),
				core: {
					version: configuration.version,
				},
				explorer: network.client.explorer,
				nethash: network.nethash,
				ports: this.buildPortMapping(plugins),
				slip44: network.slip44,
				symbol: network.client.symbol,
				token: network.client.token,
				transactionPool: {
					dynamicFees: transactionPoolConfiguration.dynamicFees?.enabled
						? transactionPoolConfiguration.dynamicFees
						: { enabled: false },
					maxTransactionAge: transactionPoolConfiguration.maxTransactionAge,
					maxTransactionBytes: transactionPoolConfiguration.maxTransactionBytes,
					maxTransactionsInPool: transactionPoolConfiguration.maxTransactionsInPool,
					maxTransactionsPerRequest: transactionPoolConfiguration.maxTransactionsPerRequest,
					maxTransactionsPerSender: transactionPoolConfiguration.maxTransactionsPerSender,
				},
				version: network.pubKeyHash,
				wif: network.wif,
			},
		};
	}

	public async configurationCrypto(request: Hapi.Request) {
		const configuration = await this.getConfiguration();
		return {
			data: configuration?.cryptoConfiguration ?? {},
		};
	}

	private getMilestone(height: number, configuration: Contracts.Crypto.NetworkConfig) {
		const milestones = configuration.milestones ?? [];

		let milestone = milestones[0];
		for (let index = milestones.length - 1; index >= 0; index--) {
			milestone = milestones[index];
			if (milestone.height <= height) {
				break;
			}
		}

		return milestone;
	}

	private buildPortMapping(plugins: Record<string, Models.Plugin>) {
		const result = {};
		const keys = ["@mainsail/p2p", "@mainsail/api-http", "@mainsail/api-database", "@mainsail/webhooks"];

		for (const key of keys) {
			if (plugins[key] && plugins[key].configuration.enabled) {
				const { configuration } = plugins[key];
				if (configuration.server && configuration.server.enabled) {
					result[key] = +configuration.server.port;
					continue;
				}

				result[key] = +configuration.port;
			}
		}

		return result;
	}

	private async getConfiguration(): Promise<Models.Configuration> {
		const configurationRepository = this.configurationRepositoryFactory();
		const configuration = await configurationRepository.createQueryBuilder().getOne();

		return configuration ?? ({} as Models.Configuration);
	}

	private async getPlugins(): Promise<Record<string, Models.Plugin>> {
		const pluginRepository = this.pluginRepositoryFactory();

		let plugins = await pluginRepository.createQueryBuilder().select().getMany();
		plugins = [{ configuration: this.apiConfiguration.all(), name: "@mainsail/api-http" }, ...plugins];

		const mappings: Record<string, Models.Plugin> = {};

		for (const plugin of plugins) {
			mappings[plugin.name] = plugin;
		}

		return mappings;
	}
}
