import { notFound } from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { AbstractController } from "@mainsail/api-common";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

// import { TransactionResource } from "../resources";

class TransactionResource {}

@injectable()
export class TransactionsController extends AbstractController {
	@inject(Identifiers.TransactionPoolQuery)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	@inject(Identifiers.TransactionPoolProcessor)
	private readonly processor!: Contracts.TransactionPool.Processor;

	public async store(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const result = await this.processor.process(request.payload.transactions);
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

	public async unconfirmed(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const pagination = super.getListingPage(request);
		const all = await this.poolQuery.getFromHighestPriority().all();
		const transactions = all.slice(pagination.offset, pagination.offset + pagination.limit);
		const results = transactions.map((t) => t.data);
		const resultsPage = {
			meta: { totalCountIsEstimate: false },
			results,
			totalCount: all.length,
		};

		return super.toPagination(resultsPage, TransactionResource as any, !!request.query.transform);
	}

	public async showUnconfirmed(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const transactionQuery = this.poolQuery.getFromHighestPriority().whereId(request.params.id);

		if ((await transactionQuery.has()) === false) {
			return notFound("Transaction not found");
		}

		const transaction = await transactionQuery.first();

		return super.respondWithResource(transaction.data, TransactionResource as any, !!request.query.transform);
	}
}
