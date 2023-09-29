import dayjs from "dayjs";
import Hapi from "@hapi/hapi";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers, Models } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { Controller } from "./controller";

@injectable()
export class NodeController extends Controller {
    @inject(ApiDatabaseIdentifiers.ConfigurationRepositoryFactory)
    private readonly configurationRepositoryFactory!: ApiDatabaseContracts.IConfigurationRepositoryFactory;

    @inject(ApiDatabaseIdentifiers.StateRepositoryFactory)
    private readonly stateRepositoryFactory!: ApiDatabaseContracts.IStateRepositoryFactory;

    @inject(ApiDatabaseIdentifiers.PluginRepositoryFactory)
    private readonly pluginRepositoryFactory!: ApiDatabaseContracts.IPluginRepositoryFactory;

    @inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
    private readonly transactionRepositoryFactory!: ApiDatabaseContracts.ITransactionRepositoryFactory;

    @inject(ApiDatabaseIdentifiers.TransactionTypeRepositoryFactory)
    private readonly transactionTypeRepositoryFactory!: ApiDatabaseContracts.ITransactionTypeRepositoryFactory;

    @inject(ApiDatabaseIdentifiers.PeerRepositoryFactory)
    private readonly peerRepositoryFactory!: ApiDatabaseContracts.IPeerRepositoryFactory;

    public async status(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        const state = await this.getState();

        return {
            data: {
                synced: false, // TODO
                now: state?.height ?? 0,
                blocksCount: state ? (
                    await this.peerRepositoryFactory().getMedianPeerHeight()
                    - state.height
                ) : 0,
                timestamp: dayjs().unix(), // TODO
            },
        };
    }

    public async syncing(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        const state = await this.getState();

        return {
            data: {
                syncing: false, // TODO
                blocks: state ? (
                    await this.peerRepositoryFactory().getMedianPeerHeight()
                    - state.height
                ) : 0,
                height: state?.height ?? 0,
                id: state?.id ?? 0,
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

        const results = await this.transactionRepositoryFactory()
            .getFeeStatistics(request.query.days);

        const groupedByTypeGroup = {};
        for (const transactionType of transactionTypes) {
            if (!groupedByTypeGroup[transactionType.typeGroup]) {
                groupedByTypeGroup[transactionType.typeGroup] = {};
            }

            const result = results.find(({ type, typeGroup }) => type === transactionType.type && typeGroup === transactionType.typeGroup);

            groupedByTypeGroup[transactionType.typeGroup][transactionType.key] = {
                avg: result?.avg ?? "0",
                max: result?.max ?? "0",
                min: result?.min ?? "0",
                sum: result?.sum ?? "0",
            };
        }

        return { meta: { days: request.query.days }, data: groupedByTypeGroup };
    }

    public async configuration(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        const configuration = await this.getConfiguration();
        const state = await this.getState();
        const plugins = await this.getPlugins();
        const transactionPoolConfiguration = plugins["@mainsail/transaction-pool"]?.configuration ?? {};

        const cryptoConfiguration = configuration.cryptoConfiguration as Contracts.Crypto.NetworkConfig;
        const network = cryptoConfiguration.network;

        return {
            data: {
                core: {
                    version: configuration.version,
                },
                nethash: network.nethash,
                slip44: network.slip44,
                wif: network.wif,
                token: network.client.token,
                symbol: network.client.symbol,
                explorer: network.client.explorer,
                version: network.pubKeyHash,
                ports: this.buildPortMapping(plugins),
                constants: this.getMilestone(state.height, cryptoConfiguration),
                transactionPool: {
                    dynamicFees: transactionPoolConfiguration.dynamicFees?.enabled ? transactionPoolConfiguration.dynamicFees : { enabled: false },
                    maxTransactionsInPool:
                        transactionPoolConfiguration.maxTransactionsInPool,
                    maxTransactionsPerSender:
                        transactionPoolConfiguration.maxTransactionsPerSender,
                    maxTransactionsPerRequest:
                        transactionPoolConfiguration.maxTransactionsPerRequest,
                    maxTransactionAge: transactionPoolConfiguration.maxTransactionAge,
                    maxTransactionBytes: transactionPoolConfiguration.maxTransactionBytes,
                },
            },
        };
    }

    public async configurationCrypto() {
        const configuration = await this.getConfiguration();
        return {
            data: configuration?.cryptoConfiguration ?? {},
        };
    }

    private getMilestone(height: number, configuration: Contracts.Crypto.NetworkConfig) {
        const milestones = configuration.milestones ?? [];

        let milestone = milestones[0];
        for (let i = milestones.length - 1; i >= 0; i--) {
            milestone = milestones[i];
            if (milestone.height <= height) break;
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

        return configuration ?? {} as Models.Configuration;
    }

    private async getState(): Promise<Models.State> {
        const stateRepository = this.stateRepositoryFactory();
        const state = await stateRepository.createQueryBuilder().getOne();
        return state ?? { height: 0 } as Models.State;
    }

    private async getPlugins(): Promise<Record<string, Models.Plugin>> {
        const pluginRepository = this.pluginRepositoryFactory();

        let plugins = await pluginRepository.createQueryBuilder().select().getMany();
        plugins = [{ name: "@mainsail/api-http", configuration: this.apiConfiguration.all() }, ...plugins];

        const mappings: Record<string, Models.Plugin> = {};

        for (const plugin of plugins) {
            mappings[plugin.name] = plugin;
        }

        return mappings;
    }
}
