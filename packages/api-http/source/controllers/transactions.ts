import Hapi from "@hapi/hapi";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { TransactionResource } from "../resources";
import { Controller } from "./controller";

@injectable()
export class TransactionsController extends Controller {
	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.ITransactionRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.MempoolTransactionRepositoryFactory)
	private readonly mempoolTransactionlRepositoryFactory!: ApiDatabaseContracts.IMempoolTransactionRepositoryFactory;

	public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const pagination = this.getQueryPagination(request.query);

		const [transactions, totalCount] = await this.transactionRepositoryFactory()
			.createQueryBuilder()
			.select()
			.orderBy("blockHeight", "DESC")
			.orderBy("sequence", "DESC")
			.offset(pagination.offset)
			.limit(pagination.limit)
			.getManyAndCount();

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: transactions,
				totalCount,
			},
			TransactionResource,
			false,
		);
	}

	public async show(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const transaction = await this.transactionRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("id = :id", { id: request.params.id })
			.getOne();

		return this.respondWithResource(transaction, TransactionResource, request.query.transform);
	}

	public async unconfirmed(request: Hapi.Request, h: Hapi.ResponseToolkit) {
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
			request.query.transform
		);
	}

	public async showUnconfirmed(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const transaction = await this.mempoolTransactionlRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("id = :id", { id: request.params.id })
			.getOne();

		return super.respondWithResource(transaction, TransactionResource, request.query.transform);
	}

	// public async types(request: Hapi.Request, h: Hapi.ResponseToolkit) {
	// 	const activatedTransactionHandlers = await this.nullHandlerRegistry.getActivatedHandlers();
	// 	const typeGroups: Record<string | number, Record<string, number>> = {};

	// 	for (const handler of activatedTransactionHandlers) {
	// 		const constructor = handler.getConstructor();

	// 		const type: number | undefined = constructor.type;
	// 		const typeGroup: number | undefined = constructor.typeGroup;
	// 		const key: string | undefined = constructor.key;

	// 		AppUtils.assert.defined<number>(type);
	// 		AppUtils.assert.defined<number>(typeGroup);
	// 		AppUtils.assert.defined<string>(key);

	// 		if (typeGroups[typeGroup] === undefined) {
	// 			typeGroups[typeGroup] = {};
	// 		}

	// 		typeGroups[typeGroup][key[0].toUpperCase() + key.slice(1)] = type;
	// 	}

	// 	return { data: typeGroups };
	// }

	// public async schemas(request: Hapi.Request, h: Hapi.ResponseToolkit) {
	// 	const activatedTransactionHandlers = await this.nullHandlerRegistry.getActivatedHandlers();
	// 	const schemasByType: Record<string, Record<string, any>> = {};

	// 	for (const handler of activatedTransactionHandlers) {
	// 		const constructor = handler.getConstructor();

	// 		const type: number | undefined = constructor.type;
	// 		const typeGroup: number | undefined = constructor.typeGroup;

	// 		AppUtils.assert.defined<number>(type);
	// 		AppUtils.assert.defined<number>(typeGroup);

	// 		if (schemasByType[typeGroup] === undefined) {
	// 			schemasByType[typeGroup] = {};
	// 		}

	// 		schemasByType[typeGroup][type] = constructor.getSchema().properties;
	// 	}

	// 	return { data: schemasByType };
	// }

	// public async store(request: Hapi.Request, h: Hapi.ResponseToolkit) {
	// 	const result = await this.processor.process(request.payload.transactions);
	// 	return {
	// 		data: {
	// 			accept: result.accept,
	// 			broadcast: result.broadcast,
	// 			excess: result.excess,
	// 			invalid: result.invalid,
	// 		},
	// 		errors: result.errors,
	// 	};
	// }
}
