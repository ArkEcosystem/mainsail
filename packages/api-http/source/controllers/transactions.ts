import Hapi from "@hapi/hapi";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
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

	@inject(ApiDatabaseIdentifiers.MempoolTransactionRepositoryFactory)
	private readonly mempoolTransactionlRepositoryFactory!: ApiDatabaseContracts.MempoolTransactionRepositoryFactory;

	public async index(request: Hapi.Request) {
		const criteria: Search.Criteria.TransactionCriteria = request.query;
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
			.getOne();

		return this.respondWithResource(transaction, TransactionResource, request.query.transform);
	}

	public async unconfirmed(request: Hapi.Request) {
		const pagination = super.getListingPage(request);

		const [transactions, totalCount] = await this.mempoolTransactionlRepositoryFactory()
			.createQueryBuilder()
			.select()
			.orderBy("fee", "DESC")
			.offset(pagination.offset)
			.limit(pagination.limit)
			.getManyAndCount();

		return super.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: transactions,
				totalCount,
			},
			TransactionResource,
			request.query.transform,
		);
	}

	public async showUnconfirmed(request: Hapi.Request) {
		const transaction = await this.mempoolTransactionlRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("id = :id", { id: request.params.id })
			.getOne();

		return super.respondWithResource(transaction, TransactionResource, request.query.transform);
	}

	public async types(request: Hapi.Request) {
		const rows = await this.transactionTypeRepositoryFactory()
			.createQueryBuilder()
			.select()
			.addOrderBy("type", "ASC")
			.addOrderBy("type_group", "ASC")
			.getMany();

		const typeGroups: Record<string | number, Record<string, number>> = {};

		for (const { type, typeGroup, key } of rows) {
			if (typeGroups[typeGroup] === undefined) {
				typeGroups[typeGroup] = {};
			}

			typeGroups[typeGroup][key[0].toUpperCase() + key.slice(1)] = type;
		}

		return { data: typeGroups };
	}

	public async schemas(request: Hapi.Request) {
		const rows = await this.transactionTypeRepositoryFactory()
			.createQueryBuilder()
			.select()
			.addOrderBy("type", "ASC")
			.addOrderBy("type_group", "ASC")
			.getMany();

		const schemasByType: Record<string, Record<string, any>> = {};

		for (const { type, typeGroup, schema } of rows) {
			if (schemasByType[typeGroup] === undefined) {
				schemasByType[typeGroup] = {};
			}

			schemasByType[typeGroup][type] = schema;
		}

		return { data: schemasByType };
	}
}
