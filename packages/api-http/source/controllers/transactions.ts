import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
	Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { TransactionResource } from "../resources/index.js";
import { Controller } from "./controller.js";

@injectable()
export class TransactionsController extends Controller {
	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.TransactionRepositoryFactory;

	public async index(request: Hapi.Request) {
		const criteria: Search.Criteria.TransactionCriteria = request.query;
		const pagination = this.getListingPage(request);
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions();

		const walletRepository = this.walletRepositoryFactory();
		const transactions = await this.transactionRepositoryFactory().findManyByCriteria(
			walletRepository,
			criteria,
			sorting,
			pagination,
			options,
		);

		return this.toPagination(
			await this.enrichTransactionResult(transactions, { fullReceipt: request.query.fullReceipt }),
			TransactionResource,
		);
	}

	public async show(request: Hapi.Request) {
		const transaction = await this.transactionRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("hash = :hash", { hash: request.params.hash })
			.getOne();

		return this.respondEnrichedTransaction(transaction, request);
	}

	private async respondEnrichedTransaction(transaction: Models.Transaction | null, request: Hapi.Request) {
		if (!transaction) {
			return Boom.notFound();
		}

		return this.respondWithResource(
			await this.enrichTransaction(transaction, undefined, request.query.fullReceipt),
			TransactionResource,
		);
	}
}
