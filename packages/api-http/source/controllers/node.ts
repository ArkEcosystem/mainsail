import dayjs from "dayjs";
import Hapi from "@hapi/hapi";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers, Models } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { Controller } from "./controller";

@injectable()
export class NodeController extends Controller {
    @inject(ApiDatabaseIdentifiers.StateRepositoryFactory)
    private readonly stateRepositoryFactory!: ApiDatabaseContracts.IStateRepositoryFactory;

    @inject(ApiDatabaseIdentifiers.PeerRepositoryFactory)
    private readonly peerRepositoryFactory!: ApiDatabaseContracts.IPeerRepositoryFactory;

    public async status(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        const state = await this.getState();

        return {
            data: {
                synced: state?.isSynced ?? false,
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
                syncing: state ? !state.isSynced : true,
                blocks: state ? (
                    await this.peerRepositoryFactory().getMedianPeerHeight()
                    - state.height
                ) : 0,
                height: state?.height ?? 0,
                id: state?.id ?? 0,
            },
        };
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

    // public async fees(request: Hapi.Request) {
    //     // @ts-ignore
    //     const handlers = this.nullHandlerRegistry.getRegisteredHandlers();
    //     const handlersKey = {};
    //     const txsTypes: Array<{ type: number; typeGroup: number }> = [];
    //     for (const handler of handlers) {
    //         handlersKey[`${handler.getConstructor().type}-${handler.getConstructor().typeGroup}`] =
    //             handler.getConstructor().key;
    //         txsTypes.push({ type: handler.getConstructor().type!, typeGroup: handler.getConstructor().typeGroup! });
    //     }

    //     const results = await this.transactionRepository.getFeeStatistics(txsTypes, request.query.days);

    //     const groupedByTypeGroup = {};
    //     for (const result of results) {
    //         if (!groupedByTypeGroup[result.typeGroup]) {
    //             groupedByTypeGroup[result.typeGroup] = {};
    //         }

    //         const handlerKey = handlersKey[`${result.type}-${result.typeGroup}`];

    //         groupedByTypeGroup[result.typeGroup][handlerKey] = {
    //             avg: result.avg,
    //             max: result.max,
    //             min: result.min,
    //             sum: result.sum,
    //         };
    //     }

    //     return { meta: { days: request.query.days }, data: groupedByTypeGroup };
    // }

    private async getState(): Promise<Models.State | null> {
        const stateRepository = this.stateRepositoryFactory();
        return stateRepository.createQueryBuilder().getOne();
    }
}
