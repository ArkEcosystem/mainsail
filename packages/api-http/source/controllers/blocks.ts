import Hapi from "@hapi/hapi";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { BlockResource, TransactionResource } from "../resources";
import { Controller } from "./controller";

@injectable()
export class BlocksController extends Controller {
	@inject(ApiDatabaseIdentifiers.BlockRepositoryFactory)
	private readonly blockRepositoryFactory!: ApiDatabaseContracts.IBlockRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.ITransactionRepositoryFactory;

	public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const pagination = this.getQueryPagination(request.query);

		const blocks = await this.blockRepositoryFactory()
			.createQueryBuilder()
			.select()
			.orderBy("height", "DESC")
			.offset(pagination.offset)
			.limit(pagination.limit)
			.getMany();

		// TODO: join transactions

		const totalCount = Number(blocks[0]?.height ?? 0);

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: blocks,
				totalCount,
			},
			BlockResource,
			request.query.transform,
		);
	}

	public async first(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const block = await this.blockRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("height = :height", { height: 1 })
			.getOne();

		// TODO: join transactions

		return this.respondWithResource(block, BlockResource, request.query.transform);
	}

	public async last(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const block = await this.blockRepositoryFactory()
			.createQueryBuilder()
			.select()
			.orderBy("height", "DESC")
			.limit(1)
			.getOne();

		// TODO: join transactions

		return this.respondWithResource(block, BlockResource, request.query.transform);
	}

	public async show(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const blockRepository = this.blockRepositoryFactory();
		const transactionRepository = this.transactionRepositoryFactory();
		const blockCriteria = this.getBlockCriteriaByIdOrHeight(request.params.id);

		// const transactionCriteria = {
		// 	typeGroup: Enums.TransactionTypeGroup.Core,
		// 	type: Enums.TransactionType.MultiPayment,
		// };

		const block = await blockRepository.findOneByCriteriaJoinTransactions(
			transactionRepository,
			blockCriteria,
			// transactionCriteria,
		);

		return this.respondWithResource(block, BlockResource, request.query.transform);
	}

	public async transactions(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const pagination = this.getQueryPagination(request.query);

		const [transactions, totalCount] = await this.transactionRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("block_id = :blockId", { blockId: request.params.id })
			.orderBy("sequence", "ASC")
			.offset(pagination.offset)
			.limit(pagination.limit)
			.getManyAndCount();

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: transactions,
				totalCount,
			},
			TransactionResource,
			request.query.transform,
		);
	}

	// private async getBlock(idOrHeight: string): Promise<Contracts.Crypto.IBlock | undefined> {
	// 	let block: Contracts.Crypto.IBlock | undefined;

	// 	if (/^-?\d+$/.test(idOrHeight)) {
	// 		const blocks = await this.database.findBlockByHeights([Number.parseInt(idOrHeight)]);

	// 		if (blocks.length > 0) {
	// 			block = blocks[0];
	// 		}
	// 	} else {
	// 		block = await this.database.getBlock(idOrHeight);
	// 	}

	// 	return block;
	// }

	private getBlockCriteriaByIdOrHeight(idOrHeight: string): Search.Criteria.OrBlockCriteria {
		const asHeight = Number(idOrHeight);
		// NOTE: This assumes all block ids are sha256 and never a valid nubmer below this threshold.
		return asHeight && asHeight <= Number.MAX_SAFE_INTEGER ? { height: asHeight } : { id: idOrHeight };
	}
}
