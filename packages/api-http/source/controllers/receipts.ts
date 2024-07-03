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
	@inject(ApiDatabaseIdentifiers.ReceiptRepositoryFactory)
	private readonly receiptRepositoryFactory!: ApiDatabaseContracts.ReceiptRepositoryFactory;

	public async index(request: Hapi.Request) {
		const pagination = this.getQueryPagination(request.query);
		const criteria: Search.Criteria.ReceiptCriteria = request.query;

		const query = this.receiptRepositoryFactory()
			.createQueryBuilder("receipt")
			.innerJoin(Models.Transaction, "transaction", "receipt.id = transaction.id");

		if (criteria.txHash) {
			query.andWhere("receipt.id = :txHash", { txHash: criteria.txHash });
		}

		// in this context, recipient always refers to a contract
		if (criteria.recipient) {
			query.andWhere("transaction.recipientId = :recipient", { recipient: criteria.recipient });
		}

		if (criteria.sender) {
			query.innerJoin(Models.Wallet, "wallet", "transaction.senderPublicKey = wallet.publicKey").andWhere(
				new ApiDatabaseContracts.Brackets((qb) => {
					qb.where("wallet.publicKey = :sender", { sender: criteria.sender }).orWhere(
						"wallet.address = :sender",
						{ sender: criteria.sender },
					);
				}),
			);
		}

		const [receipts, totalCount] = await query
			.orderBy("transaction.sequence", "DESC")
			.addOrderBy("transaction.blockHeight", "DESC")
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

	public async contracts(request: Hapi.Request) {
		const criteria: Search.Criteria.ReceiptCriteria = request.query;
		const pagination = this.getQueryPagination(request.query);

		const query = this.receiptRepositoryFactory()
			.createQueryBuilder("receipt")
			.innerJoin(Models.Transaction, "transaction", "receipt.id = transaction.id")
			.where("receipt.deployedContractAddress IS NOT NULL");

		if (criteria.sender) {
			query.innerJoin(Models.Wallet, "wallet", "transaction.senderPublicKey = wallet.publicKey").andWhere(
				new ApiDatabaseContracts.Brackets((qb) => {
					qb.where("wallet.publicKey = :sender", { sender: criteria.sender }).orWhere(
						"wallet.address = :sender",
						{ sender: criteria.sender },
					);
				}),
			);
		}

		const [receipts, totalCount] = await query
			.orderBy("transaction.sequence", "DESC")
			.addOrderBy("transaction.blockHeight", "DESC")
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
