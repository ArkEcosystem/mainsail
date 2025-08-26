import Hapi from "@hapi/hapi";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { ReceiptResource } from "../resources/index.js";
import { Controller } from "./controller.js";

@injectable()
export class ReceiptsController extends Controller {
	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.TransactionRepositoryFactory;

	public async index(request: Hapi.Request) {
		const pagination = this.getQueryPagination(request.query);
		const criteria: Search.Criteria.ReceiptCriteria = request.query;
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions();

		let transactionCriteria: Search.Criteria.TransactionCriteria = {};

		if (criteria.transactionHash) {
			transactionCriteria.hash = criteria.transactionHash;
		}

		// in this context, recipient always refers to a contract
		if (criteria.to) {
			transactionCriteria.to = criteria.to;
		}

		if (criteria.from) {
			transactionCriteria = { ...transactionCriteria, ...this.#inferSenderCriteria(criteria.from.toString()) };
		}

		const walletRepository = this.walletRepositoryFactory();
		const receipts = await this.transactionRepositoryFactory().findManyByCriteria(
			walletRepository,
			transactionCriteria,
			sorting,
			pagination,
			options,
		);

		return this.toPagination(receipts, ReceiptResource);
	}

	public async show(request: Hapi.Request) {
		const receipt = await this.transactionRepositoryFactory()
			.createQueryBuilder("transaction")
			.select(this.#getReceiptColumns(request.query.fullReceipt))
			.where("transaction.hash = :transactionHash", { transactionHash: request.params.transactionHash })
			.getOne();

		return this.respondWithResource(receipt, ReceiptResource);
	}

	public async contracts(request: Hapi.Request) {
		const criteria: Search.Criteria.ReceiptCriteria = request.query;
		const pagination = this.getQueryPagination(request.query);
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions();

		let transactionCriteria: Search.Criteria.TransactionCriteria = {
			deployedContractAddress: true,
		};

		if (criteria.from) {
			transactionCriteria = { ...transactionCriteria, ...this.#inferSenderCriteria(criteria.from.toString()) };
		}

		const walletRepository = this.walletRepositoryFactory();
		const receipts = await this.transactionRepositoryFactory().findManyByCriteria(
			walletRepository,
			transactionCriteria,
			sorting,
			pagination,
			options,
		);

		return this.toPagination(receipts, ReceiptResource);
	}

	protected getListingOptions(): Contracts.Api.Options {
		return {
			estimateTotalCount: false,
		};
	}

	protected getListingOrder(_request: Hapi.Request): Contracts.Api.Sorting {
		return [
			{
				direction: "desc",
				property: "blockNumber",
			},
			{
				direction: "desc",
				property: "transactionIndex",
			},
		];
	}

	#inferSenderCriteria(from: string): Search.Criteria.TransactionCriteria {
		const likelyAddress = from.startsWith("0x") && from.length === 42;
		return likelyAddress ? { from } : { senderPublicKey: from };
	}

	#getReceiptColumns(fullReceipt?: boolean): string[] {
		let columns = [
			"transaction.hash",
			"transaction.status",
			"transaction.gasUsed",
			"transaction.gasRefunded",
			"transaction.deployedContractAddress",
		];
		if (fullReceipt) {
			columns = [...columns, "transaction.output", "transaction.logs"];
		}

		return columns;
	}
}
