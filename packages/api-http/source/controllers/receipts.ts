import Hapi from "@hapi/hapi";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { ReceiptResource } from "../resources/index.js";
import { Controller } from "./controller.js";

@injectable()
export class ReceiptsController extends Controller {
	@inject(ApiDatabaseIdentifiers.ReceiptRepositoryFactory)
	private readonly receiptRepositoryFactory!: ApiDatabaseContracts.ReceiptRepositoryFactory;

	public async index(request: Hapi.Request) {
		const pagination = this.getQueryPagination(request.query);
		const criteria: Search.Criteria.ReceiptCriteria = request.query;
		const options = this.getListingOptions();

		const apiNodes = await this.receiptRepositoryFactory().findManyByCriteria(
			criteria,
			[
				{
					direction: "desc",
					property: "blockHeight",
				},
			],
			pagination,
			options,
		);

		return this.toPagination(apiNodes, ReceiptResource, request.query.transform);
	}

	protected getListingOptions(): Contracts.Api.Options {
		return {
			estimateTotalCount: false,
		};
	}
}
