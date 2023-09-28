import dayjs from "dayjs";
import Hapi from "@hapi/hapi";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers, Models } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { Controller } from "./controller";

@injectable()
export class NodeController extends Controller {
    @inject(ApiDatabaseIdentifiers.StateRepositoryFactory)
    private readonly stateRepositoryFactory!: ApiDatabaseContracts.IStateRepositoryFactory;

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

    // public async configuration(request: Hapi.Request, h: Hapi.ResponseToolkit) {
    //     const dynamicFees = this.transactionPoolConfiguration.getRequired<{
    //         enabled?: boolean;
    //     }>("dynamicFees");

    //     const network = Managers.configManager.get("network");

    //     return {
    //         data: {
    //             core: {
    //                 version: this.app.version(),
    //             },
    //             nethash: network.nethash,
    //             slip44: network.slip44,
    //             wif: network.wif,
    //             token: network.client.token,
    //             symbol: network.client.symbol,
    //             explorer: network.client.explorer,
    //             version: network.pubKeyHash,
    //             ports: super.toResource(this.configRepository, PortsResource),
    //             constants: Managers.configManager.getMilestone(this.blockchain.getLastHeight()),
    //             transactionPool: {
    //                 dynamicFees: dynamicFees.enabled ? dynamicFees : { enabled: false },
    //                 maxTransactionsInPool:
    //                     this.transactionPoolConfiguration.getRequired<number>("maxTransactionsInPool"),
    //                 maxTransactionsPerSender:
    //                     this.transactionPoolConfiguration.getRequired<number>("maxTransactionsPerSender"),
    //                 maxTransactionsPerRequest:
    //                     this.transactionPoolConfiguration.getRequired<number>("maxTransactionsPerRequest"),
    //                 maxTransactionAge: this.transactionPoolConfiguration.getRequired<number>("maxTransactionAge"),
    //                 maxTransactionBytes: this.transactionPoolConfiguration.getRequired<number>("maxTransactionBytes"),
    //             },
    //         },
    //     };
    // }

    // public async configurationCrypto() {
    //     return {
    //         data: Managers.configManager.all(),
    //     };
    // }

    private async getState(): Promise<Models.State | null> {
        const stateRepository = this.stateRepositoryFactory();
        return stateRepository.createQueryBuilder().getOne();
    }
}
