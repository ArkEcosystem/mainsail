import Hapi from "@hapi/hapi";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { TransactionResource } from "../resources";
import { Controller } from "./controller";

@injectable()
export class TransactionsController extends Controller {
	@inject(ApiDatabaseIdentifiers.TransactionRepository)
	private readonly transactionRepository!: ApiDatabaseContracts.ITransactionRepository;

	public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const pagination = this.getQueryPagination(request.query);

		const [transactions, totalCount] = await this.transactionRepository
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

	// public async show(request: Hapi.Request, h: Hapi.ResponseToolkit) {
	// 	console.log("ID:", request.params.id);

	// 	const transaction = await this.database.getTransaction(request.params.id);
	// 	if (!transaction) {
	// 		return notFound("Transaction not found");
	// 	}

	// 	// TODO: Include block
	// 	// if (request.query.transform) {
	// 	// 	const block = await this.database.getBlock(transaction.data.blockId);

	// 	// 	return this.respondWithResource(
	// 	// 		{ block: block.data, data: transaction.data },
	// 	// 		TransactionWithBlockResource,
	// 	// 		true,
	// 	// 	);
	// 	// } else {
	// 	// 	return this.respondWithResource(transaction.data, TransactionResource, false);
	// 	// }

	// 	return this.respondWithResource(transaction.data, TransactionResource, false);
	// }

	// public async unconfirmed(request: Hapi.Request, h: Hapi.ResponseToolkit) {
	// 	const pagination: Pagination = super.getListingPage(request);
	// 	const all: Contracts.Crypto.ITransaction[] = await this.poolQuery.getFromHighestPriority().all();
	// 	const transactions: Contracts.Crypto.ITransaction[] = all.slice(
	// 		pagination.offset,
	// 		pagination.offset + pagination.limit,
	// 	);
	// 	const results = transactions.map((t) => t.data);
	// 	const resultsPage = {
	// 		meta: { totalCountIsEstimate: false },
	// 		results,
	// 		totalCount: all.length,
	// 	};

	// 	return super.toPagination(resultsPage, TransactionResource, !!request.query.transform);
	// }

	// public async showUnconfirmed(request: Hapi.Request, h: Hapi.ResponseToolkit) {
	// 	const transactionQuery: Contracts.TransactionPool.QueryIterable = this.poolQuery
	// 		.getFromHighestPriority()
	// 		.whereId(request.params.id);

	// 	if ((await transactionQuery.has()) === false) {
	// 		return notFound("Transaction not found");
	// 	}

	// 	const transaction: Contracts.Crypto.ITransaction = await transactionQuery.first();

	// 	return super.respondWithResource(transaction.data, TransactionResource, !!request.query.transform);
	// }

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
}
