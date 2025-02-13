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
			.innerJoin(Models.Transaction, "transaction", "receipt.id = transaction.id");

		if (criteria.txHash) {
			query.andWhere("receipt.id = :txHash", { txHash: criteria.txHash });
		}

		// in this context, recipient always refers to a contract
		if (criteria.recipient) {
			query.andWhere("transaction.recipientAddress = :recipient", { recipient: criteria.recipient });
		}

		if (criteria.sender) {
			query.innerJoin(Models.Wallet, "wallet", "transaction.senderAddress = wallet.address").andWhere(
				new ApiDatabaseContracts.Brackets((qb) => {
					qb.where("wallet.publicKey = :sender", { sender: criteria.sender }).orWhere(
						"wallet.address = :sender",
						{ sender: criteria.sender },
					);
				}),
			);
		}

		const [receipts, totalCount] = await query
			.orderBy("transaction.blockHeight", "DESC")
			.addOrderBy("transaction.sequence", "DESC")
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
			.where("id = :id", { id: request.params.id })
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
			.innerJoin(Models.Transaction, "transaction", "receipt.id = transaction.id")
			.where("receipt.deployedContractAddress IS NOT NULL");

		if (criteria.sender) {
			query.innerJoin(Models.Wallet, "wallet", "transaction.senderAddress = wallet.address").andWhere(
				new ApiDatabaseContracts.Brackets((qb) => {
					qb.where("wallet.publicKey = :sender", { sender: criteria.sender }).orWhere(
						"wallet.address = :sender",
						{ sender: criteria.sender },
					);
				}),
			);
		}

		const [receipts, totalCount] = await query
			.orderBy("transaction.blockHeight", "DESC")
			.addOrderBy("transaction.sequence", "DESC")
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
