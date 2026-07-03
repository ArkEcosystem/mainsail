import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import { notFound } from "@hapi/boom";
import { AbstractController } from "@mainsail/api-common";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { TransactionResource } from "../resources/index.js";

@injectable()
export class TransactionsController extends AbstractController {
	@inject(Identifiers.TransactionPool.Processor)
	private readonly processor!: Contracts.TransactionPool.Processor;

	@inject(Identifiers.TransactionPool.Query)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	public async store(request: Types.HapiRequest): Promise<object> {
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

	public async unconfirmed(request: Types.HapiRequest): Promise<object> {
		const pagination: Contracts.Api.Pagination = super.getListingPage(request);

		const poolQuery = this.poolQuery.getFromHighestPriority();

		const makePredicate = async (
			transaction: Contracts.Crypto.Transaction,
			key: Extract<keyof Contracts.Crypto.TransactionData, "to" | "from">,
			parameter: string | string[],
		): Promise<boolean> =>
			Array.isArray(parameter) ? parameter.includes(transaction[key]!) : parameter === transaction[key];

		if (request.query.from) {
			poolQuery.wherePredicate(async (t) => makePredicate(t, "from", request.query.from));
		}

		if (request.query.to) {
			poolQuery.wherePredicate(async (t) => makePredicate(t, "to", request.query.to));
		}

		if (request.query.address) {
			poolQuery.wherePredicate(async (t) => {
				const [isFrom, isTo] = await Promise.all([
					makePredicate(t, "from", request.query.address),
					makePredicate(t, "to", request.query.address),
				]);

				return isFrom || isTo;
			});
		}

		const all: Contracts.Crypto.Transaction[] = await poolQuery.all();
		const transactions: Contracts.Crypto.Transaction[] = all.slice(
			pagination.offset,
			pagination.offset + pagination.limit,
		);
		const resultsPage = {
			results: transactions,
			totalCount: all.length,
		};

		return super.toPagination(resultsPage, TransactionResource);
	}

	public async showUnconfirmed(request: Types.HapiRequest): Promise<object> {
		const transactionQuery: Contracts.TransactionPool.QueryIterable = this.poolQuery
			.getFromHighestPriority()
			.whereHash(request.params.hash);

		if ((await transactionQuery.has()) === false) {
			return notFound("Transaction not found");
		}

		const transaction: Contracts.Crypto.Transaction = await transactionQuery.first();

		return super.respondWithResource(transaction, TransactionResource);
	}
}
