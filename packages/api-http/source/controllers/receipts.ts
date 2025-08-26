import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
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

		const query = this.transactionRepositoryFactory()
			.createQueryBuilder("transaction")
			.select(this.#getReceiptColumns(request.query.fullReceipt));

		if (criteria.transactionHash) {
			query.andWhere("transaction.hash = :transactionHash", { transactionHash: criteria.transactionHash });
		}

		// in this context, recipient always refers to a contract
		if (criteria.to) {
			query.andWhere("transaction.to = :to", { to: criteria.to });
		}

		if (criteria.from) {
			query.innerJoin(Models.Wallet, "wallet", "transaction.from = wallet.address").andWhere(
				new ApiDatabaseContracts.Brackets((qb) => {
					qb.where("wallet.publicKey = :from", { from: criteria.from }).orWhere("wallet.address = :from", {
						from: criteria.from,
					});
				}),
			);
		}

		const [receipts, totalCount] = await query
			.orderBy("transaction.blockNumber", "DESC")
			.addOrderBy("transaction.transactionIndex", "DESC")
			.offset(pagination.offset)
			.limit(pagination.limit)
			.select()
			.getManyAndCount();

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: receipts,
				totalCount,
			},
			ReceiptResource,
		);
	}

	public async show(request: Hapi.Request) {
		const receipt = await this.transactionRepositoryFactory()
			.createQueryBuilder("transaction")
			.select(this.#getReceiptColumns(request.query.fullReceipt))
			.where("transaction.hash = :transactionHash", { transactionHash: request.params.transactionHash })
			.getOne();

		if (!receipt) {
			return Boom.notFound();
		}

		return this.toResource(receipt, ReceiptResource);
	}

	public async contracts(request: Hapi.Request) {
		const criteria: Search.Criteria.ReceiptCriteria = request.query;
		const pagination = this.getQueryPagination(request.query);

		const query = this.transactionRepositoryFactory()
			.createQueryBuilder("transaction")
			.select(this.#getReceiptColumns(request.query.fullReceipt))
			.where("transaction.deployedContractAddress IS NOT NULL");

		if (criteria.from) {
			query.innerJoin(Models.Wallet, "wallet", "transaction.from = wallet.address").andWhere(
				new ApiDatabaseContracts.Brackets((qb) => {
					qb.where("wallet.publicKey = :from", { from: criteria.from }).orWhere("wallet.address = :from", {
						from: criteria.from,
					});
				}),
			);
		}

		const [receipts, totalCount] = await query
			.orderBy("transaction.blockNumber", "DESC")
			.addOrderBy("transaction.transactionIndex", "DESC")
			.offset(pagination.offset)
			.limit(pagination.limit)
			.select()
			.getManyAndCount();

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: receipts,
				totalCount,
			},
			ReceiptResource,
		);
	}

	protected getListingOptions(): Contracts.Api.Options {
		return {
			estimateTotalCount: false,
		};
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
