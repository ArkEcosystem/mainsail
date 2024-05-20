import { notFound } from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { AbstractController } from "@mainsail/api-common";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { TransactionResource } from "../resources/index.js";

@injectable()
export class TransactionsController extends AbstractController {
	@inject(Identifiers.TransactionPool.Processor)
	private readonly processor!: Contracts.TransactionPool.Processor;

	@inject(Identifiers.TransactionPool.Query)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	@inject(Identifiers.Transaction.Handler.Registry)
	private readonly nullHandlerRegistry!: Handlers.Registry;

	public async store(request: Hapi.Request) {
		const result = await this.processor.process(
			// @ts-ignore
			request.payload.transactions.map((transaction: string) => Buffer.from(transaction, "hex")),
		);
		return {
			data: {
				accept: result.accept,
				broadcast: result.broadcast,
				excess: result.excess,
				invalid: result.invalid,
			},
			errors: result.errors,
		};
	}

	public async unconfirmed(request: Hapi.Request) {
		const pagination: Contracts.Api.Pagination = super.getListingPage(request);
		const all: Contracts.Crypto.Transaction[] = await this.poolQuery.getFromHighestPriority().all();
		const transactions: Contracts.Crypto.Transaction[] = all.slice(
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

		const transaction: Contracts.Crypto.Transaction = await transactionQuery.first();

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

			Utils.assert.defined<number>(type);
			Utils.assert.defined<number>(typeGroup);
			Utils.assert.defined<string>(key);

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

			Utils.assert.defined<number>(type);
			Utils.assert.defined<number>(typeGroup);

			if (schemasByType[typeGroup] === undefined) {
				schemasByType[typeGroup] = {};
			}

			schemasByType[typeGroup][type] = constructor.getSchema().properties;
		}

		return { data: schemasByType };
	}
}
