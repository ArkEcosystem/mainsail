import Hapi from "@hapi/hapi";
import {
    Contracts as ApiDatabaseContracts,
    Identifiers as ApiDatabaseIdentifiers,
    Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { Controller } from "./controller";
import { ApiNodeResource } from "../resources";

@injectable()
export class ApiNodesController extends Controller {
    @inject(ApiDatabaseIdentifiers.ApiNodeRepositoryFactory)
    private readonly apiNodeRepositoryFactory!: ApiDatabaseContracts.IApiNodeRepositoryFactory;

    public async index(request: Hapi.Request) {
        const pagination = this.getQueryPagination(request.query);
        const criteria: Search.Criteria.ApiNodeCriteria = request.query;
        const sorting = this.getListingOrder(request);
        const options = this.getListingOptions();

        const apiNodes = await this.apiNodeRepositoryFactory().findManyByCriteria(criteria, sorting, pagination, options);

        return this.toPagination(apiNodes, ApiNodeResource, request.query.transform);
    }

    protected getListingOptions(): Contracts.Api.Options {
        return {
            estimateTotalCount: false,
        };
    }
}
