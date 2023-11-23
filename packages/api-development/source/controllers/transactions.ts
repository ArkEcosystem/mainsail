import { notFound } from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils as AppUtils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { TransactionResource } from "../resources";
import { Contracts as ApiContracts } from "@mainsail/api-common";
import { Controller } from "./controller";

@injectable()
export class TransactionsController extends Controller {
	@inject(Identifiers.TransactionHandlerRegistry)
	@tagged("state", "null")
	private readonly nullHandlerRegistry!: Handlers.Registry;

	@inject(Identifiers.TransactionPoolQuery)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	public async unconfirmed(request: Hapi.Request) {
		const pagination: ApiContracts.Pagination = super.getListingPage(request);
		const all: Contracts.Crypto.ITransaction[] = await this.poolQuery.getFromHighestPriority().all();
		const transactions: Contracts.Crypto.ITransaction[] = all.slice(
			pagination.offset,
			pagination.offset + pagination.limit,
		);
		const results = transactions.map((t) => t.data);
		const resultsPage = {
			results,
			totalCount: all.length,
		};

		return super.toPagination(resultsPage, TransactionResource, !!request.query.transform);
	}

	public async showUnconfirmed(request: Hapi.Request) {
		const transactionQuery: Contracts.TransactionPool.QueryIterable = this.poolQuery
			.getFromHighestPriority()
			.whereId(request.params.id);

		if ((await transactionQuery.has()) === false) {
			return notFound("Transaction not found");
		}

		const transaction: Contracts.Crypto.ITransaction = await transactionQuery.first();

		return super.respondWithResource(transaction.data, TransactionResource, !!request.query.transform);
	}

	public async types(request: Hapi.Request) {
		const activatedTransactionHandlers = await this.nullHandlerRegistry.getActivatedHandlers();
		const typeGroups: Record<string | number, Record<string, number>> = {};

		for (const handler of activatedTransactionHandlers) {
			const constructor = handler.getConstructor();

			const type: number | undefined = constructor.type;
			const typeGroup: number | undefined = constructor.typeGroup;
			const key: string | undefined = constructor.key;

			AppUtils.assert.defined<number>(type);
			AppUtils.assert.defined<number>(typeGroup);
			AppUtils.assert.defined<string>(key);

			if (typeGroups[typeGroup] === undefined) {
				typeGroups[typeGroup] = {};
			}

			typeGroups[typeGroup][key[0].toUpperCase() + key.slice(1)] = type;
		}

		return { data: typeGroups };
	}

	public async schemas(request: Hapi.Request) {
		const activatedTransactionHandlers = await this.nullHandlerRegistry.getActivatedHandlers();
		const schemasByType: Record<string, Record<string, any>> = {};

		for (const handler of activatedTransactionHandlers) {
			const constructor = handler.getConstructor();

			const type: number | undefined = constructor.type;
			const typeGroup: number | undefined = constructor.typeGroup;

			AppUtils.assert.defined<number>(type);
			AppUtils.assert.defined<number>(typeGroup);

			if (schemasByType[typeGroup] === undefined) {
				schemasByType[typeGroup] = {};
			}

			schemasByType[typeGroup][type] = constructor.getSchema().properties;
		}

		return { data: schemasByType };
	}
}
