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

	@inject(ApiDatabaseIdentifiers.TransactionTypeRepositoryFactory)
	private readonly transactionTypeRepositoryFactory!: ApiDatabaseContracts.TransactionTypeRepositoryFactory;

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
			await this.enrichTransactionResult(transactions),
			TransactionResource,
			request.query.transform,
		);
	}

	public async show(request: Hapi.Request) {
		const transaction = await this.transactionRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("id = :id", { id: request.params.id })
			.getOne();

		return this.respondEnrichedTransaction(transaction, request);
	}

	public async schemas(request: Hapi.Request) {
		const transactionTypes = await this.getTransactionTypes();

		const schemasByKey: Record<string, any> = {};

		for (const { key, schema } of transactionTypes) {
			schemasByKey[key] = schema;
		}

		return { data: schemasByKey };
	}

	// TODO: Remove endpoint
	public async fees(request: Hapi.Request) {
		const typeGroups: Record<string | number, Record<string, number>> = {};

		return { data: typeGroups };
	}

	private async getTransactionTypes(): Promise<Models.TransactionType[]> {
		return this.transactionTypeRepositoryFactory().createQueryBuilder().select().addOrderBy("key", "ASC").getMany();
	}

	private async respondEnrichedTransaction(transaction: Models.Transaction | null, request: Hapi.Request) {
		if (!transaction) {
			return Boom.notFound();
		}

		return this.respondWithResource(
			await this.enrichTransaction(transaction),
			TransactionResource,
			request.query.transform,
		);
	}
}
