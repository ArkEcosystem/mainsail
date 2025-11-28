import Hapi from "@hapi/hapi";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { ApiNodeResource } from "../resources/index.js";
import { Controller } from "./controller.js";

@injectable()
export class ApiNodesController extends Controller {
	@inject(ApiDatabaseIdentifiers.ApiNodeRepositoryFactory)
	private readonly apiNodeRepositoryFactory!: ApiDatabaseContracts.ApiNodeRepositoryFactory;

	public async index(request: Hapi.Request): Promise<object> {
		const pagination = this.getQueryPagination(request.query);
		const criteria: Search.Criteria.ApiNodeCriteria = request.query;
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions(request);

		const apiNodes = await this.apiNodeRepositoryFactory().findManyByCriteria(
			criteria,
			sorting,
			pagination,
			options,
		);

		return this.toPagination(apiNodes, ApiNodeResource);
	}

	protected getListingOptions(_request: Hapi.Request): Search.Options {
		return {
			estimateTotalCount: false,
		};
	}
}
