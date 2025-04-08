import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { Contracts as ApiDatabaseContracts, Models, Search } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { ReceiptResource } from "../resources/index.js";
import { Controller } from "./controller.js";

@injectable()
export class ReceiptsController extends Controller {
	public async index(request: Hapi.Request) {
		const pagination = this.getQueryPagination(request.query);
		const criteria: Search.Criteria.ReceiptCriteria = request.query;

		const query = this.receiptRepositoryFactory()
			.createQueryBuilder("receipt")
			.select(this.getReceiptColumns(request.query.fullReceipt))
			.innerJoin(Models.Transaction, "transaction", "receipt.transactionHash = transaction.hash");

		if (criteria.transactionHash) {
			query.andWhere("receipt.transactionHash = :transactionHash", { transactionHash: criteria.transactionHash });
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
			false,
		);
	}

	public async show(request: Hapi.Request) {
		const receipt = await this.receiptRepositoryFactory()
			.createQueryBuilder("receipt")
			.select(this.getReceiptColumns(request.query.fullReceipt))
			.where("receipt.transactionHash = :transactionHash", { transactionHash: request.params.transactionHash })
			.getOne();

		if (!receipt) {
			return Boom.notFound();
		}

		return this.toResource(receipt, ReceiptResource, false);
	}

	public async contracts(request: Hapi.Request) {
		const criteria: Search.Criteria.ReceiptCriteria = request.query;
		const pagination = this.getQueryPagination(request.query);

		const query = this.receiptRepositoryFactory()
			.createQueryBuilder("receipt")
			.select(this.getReceiptColumns(request.query.fullReceipt))
			.innerJoin(Models.Transaction, "transaction", "receipt.transactionHash = transaction.hash")
			.where("receipt.contractAddress IS NOT NULL");

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
			false,
		);
	}

	protected getListingOptions(): Contracts.Api.Options {
		return {
			estimateTotalCount: false,
		};
	}
}
