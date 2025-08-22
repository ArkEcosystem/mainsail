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

		const queryRunner = this.receiptRepositoryFactory().manager.connection.createQueryRunner("slave");

		try {
			await queryRunner.startTransaction("REPEATABLE READ");

			const queryReceipts = this.receiptRepositoryFactory()
				.createQueryBuilder("receipt")
				.setQueryRunner(queryRunner)
				.select(this.getReceiptColumns(request.query.fullReceipt))
				.innerJoin(Models.Transaction, "transaction", "receipt.transactionHash = transaction.hash");

			const queryTotalCount = this.receiptRepositoryFactory()
				.createQueryBuilder("receipt")
				.setQueryRunner(queryRunner)
				.select("COUNT(1) AS total_count");

			if (criteria.transactionHash) {
				for (const query of [queryReceipts, queryTotalCount]) {
					query.andWhere("receipt.transactionHash = :transactionHash", {
						transactionHash: criteria.transactionHash,
					});
				}
			}

			// Add join to count query conditionally
			if (criteria.to || criteria.from) {
				queryTotalCount.innerJoin(
					Models.Transaction,
					"transaction",
					"receipt.transactionHash = transaction.hash",
				);
			}

			// in this context, recipient always refers to a contract
			if (criteria.to) {
				for (const query of [queryReceipts, queryTotalCount]) {
					query.andWhere("transaction.to = :to", { to: criteria.to });
				}
			}

			if (criteria.from) {
				for (const query of [queryReceipts, queryTotalCount]) {
					query.andWhere(
						new ApiDatabaseContracts.Brackets((qb) => {
							qb.where("transaction.senderPublicKey = :from", { from: criteria.from }).orWhere(
								"transaction.from = :from",
								{
									from: criteria.from,
								},
							);
						}),
					);
				}
			}

			const [receipts, totalCount] = await Promise.all([
				queryReceipts
					.orderBy("transaction.blockNumber", "DESC")
					.addOrderBy("transaction.transactionIndex", "DESC")
					.offset(pagination.offset)
					.limit(pagination.limit)
					.select()
					.getMany(),
				queryTotalCount.getRawOne().then((row) => Number.parseFloat(row["total_count"])),
			]);

			return this.toPagination(
				{
					meta: { totalCountIsEstimate: false },
					results: receipts,
					totalCount,
				},
				ReceiptResource,
			);
		} catch (ex) {
			await queryRunner.rollbackTransaction();
			throw ex;
		} finally {
			await queryRunner.release();
		}
	}

	public async show(request: Hapi.Request) {
		const receipt = await this.receiptRepositoryFactory()
			.createQueryBuilder("receipt")
			.select(this.getReceiptColumns(request.query.fullReceipt))
			.where("receipt.transactionHash = :transactionHash", { transactionHash: request.params.transactionHash })
			.getOne();

		return this.respondWithResource(receipt, ReceiptResource);
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
			query.andWhere(
				new ApiDatabaseContracts.Brackets((qb) => {
					qb.where("transaction.senderPublicKey = :from", { from: criteria.from }).orWhere(
						"transaction.from = :from",
						{
							from: criteria.from,
						},
					);
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
}
