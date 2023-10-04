import Hapi from "@hapi/hapi";
import Boom from "@hapi/boom";
import {
    Contracts as ApiDatabaseContracts,
    Identifiers as ApiDatabaseIdentifiers,

    Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";


import { Controller } from "./controller";
import { TransactionResource } from "../resources";

@injectable()
export class VotesController extends Controller {
    @inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
    private readonly transactionRepositoryFactory!: ApiDatabaseContracts.ITransactionRepositoryFactory;

    @inject(ApiDatabaseIdentifiers.WalletRepositoryFactory)
    private readonly walletRepositoryFactory!: ApiDatabaseContracts.IWalletRepositoryFactory;

    public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        const criteria: Search.Criteria.TransactionCriteria = {
            ...request.query,
            typeGroup: Contracts.Crypto.TransactionTypeGroup.Core,
            type: Contracts.Crypto.TransactionType.Vote,
        };

        const pagination = this.getListingPage(request);
        const sorting = this.getListingOrder(request);
        const options = this.getListingOptions();

        const walletRepository = this.walletRepositoryFactory();
        const transactions = await this.transactionRepositoryFactory().findManyByCritera(
            walletRepository,
            criteria,
            sorting,
            pagination,
            options,
        );

        return this.toPagination(transactions, TransactionResource, request.query.transform);
    }

    public async show(request: Hapi.Request, h: Hapi.ResponseToolkit) {
        const transaction = await this.transactionRepositoryFactory()
            .createQueryBuilder()
            .select()
            .where("id = :id", { id: request.params.id })
            .andWhere("type = :type", { type: Contracts.Crypto.TransactionType.Vote })
            .andWhere("type_group = :typeGroup", { typeGroup: Contracts.Crypto.TransactionTypeGroup.Core })
            .getOne();

        if (!transaction) {
            return Boom.notFound("Vote not found");
        }

        return this.respondWithResource(transaction, TransactionResource, request.query.transform);
    }
}