import Boom from "@hapi/boom";
import type { Types } from "@mainsail/api-common";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
	Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { TransactionResource, TransactionTokenAction } from "../resources/index.js";
import { Controller } from "./controller.js";

@injectable()
export class TransactionsController extends Controller {
	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.TransactionRepositoryFactory;

	public async index(request: Types.HapiRequest): Promise<object> {
		const criteria: Search.Criteria.TransactionCriteria = request.query;
		const pagination = this.getListingPage(request);
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions(request);

		const walletRepository = this.walletRepositoryFactory();
		const transactions = await this.transactionRepositoryFactory().findManyByCriteria(
			walletRepository,
			criteria,
			sorting,
			pagination,
			options,
		);

		return this.toPagination(
			await this.enrichTransactionResult(transactions, {
				fullReceipt: request.query.fullReceipt,
				includeTokens: request.query.includeTokens,
			}),
			TransactionResource,
		);
	}

	public async show(request: Types.HapiRequest): Promise<object> {
		const transaction = await this.transactionRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("hash = :hash", { hash: request.params.hash })
			.getOne();

		return this.respondEnrichedTransaction(transaction, request);
	}

	private async respondEnrichedTransaction(transaction: Models.Transaction | null, request: Types.HapiRequest) {
		if (!transaction) {
			return Boom.notFound();
		}

		let transferredTokens: TransactionTokenAction[] | undefined = undefined;
		if (request.query.includeTokens) {
			const fetched = await this.fetchTransactionTokens([transaction.hash]);
			transferredTokens = fetched[transaction.hash];
		}

		return this.respondWithResource(
			await this.enrichTransaction(transaction, {
				fullReceipt: request.query.fullReceipt,
				tokens: transferredTokens,
			}),
			TransactionResource,
		);
	}
}
