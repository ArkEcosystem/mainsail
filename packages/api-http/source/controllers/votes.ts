import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { TransactionResource } from "../resources";
import { Controller } from "./controller";

@injectable()
export class VotesController extends Controller {
	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.TransactionRepositoryFactory;

	public async index(request: Hapi.Request) {
		const criteria: Search.Criteria.TransactionCriteria = {
			...request.query,
			type: Contracts.Crypto.TransactionType.Vote,
			typeGroup: Contracts.Crypto.TransactionTypeGroup.Core,
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

	public async show(request: Hapi.Request) {
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
