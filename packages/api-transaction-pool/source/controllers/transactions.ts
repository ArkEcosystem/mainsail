import { notFound } from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { AbstractController } from "@mainsail/api-common";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { TransactionResource } from "../resources/index.js";

@injectable()
export class TransactionsController extends AbstractController {
	@inject(Identifiers.TransactionPool.Processor)
	private readonly processor!: Contracts.TransactionPool.Processor;

	@inject(Identifiers.TransactionPool.Query)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

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

		const poolQuery = this.poolQuery.getFromHighestPriority();

		if (request.query.from) {
			poolQuery.wherePredicate(async (t) =>
				Array.isArray(request.query.from)
					? request.query.from.includes(t.data.from)
					: request.query.from === t.data.from,
			);
		}

		if (request.query.to) {
			poolQuery.wherePredicate(async (t) =>
				Array.isArray(request.query.to) ? request.query.to.includes(t.data.to) : request.query.to === t.data.to,
			);
		}

		const all: Contracts.Crypto.Transaction[] = await poolQuery.all();
		const transactions: Contracts.Crypto.Transaction[] = all.slice(
			pagination.offset,
			pagination.offset + pagination.limit,
		);
		const results = transactions.map((t) => t.data);
		const resultsPage = {
			results,
			totalCount: all.length,
		};

		return super.toPagination(resultsPage, TransactionResource);
	}

	public async showUnconfirmed(request: Hapi.Request) {
		const transactionQuery: Contracts.TransactionPool.QueryIterable = this.poolQuery
			.getFromHighestPriority()
			.whereId(request.params.id);

		if ((await transactionQuery.has()) === false) {
			return notFound("Transaction not found");
		}

		const transaction: Contracts.Crypto.Transaction = await transactionQuery.first();

		return super.respondWithResource(transaction.data, TransactionResource);
	}
}
