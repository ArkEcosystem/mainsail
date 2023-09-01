import Hapi from "@hapi/hapi";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { BlockResource, TransactionResource } from "../resources";
import { Controller } from "./controller";

@injectable()
export class BlocksController extends Controller {
	@inject(ApiDatabaseIdentifiers.BlockRepository)
	private readonly blockRepository!: ApiDatabaseContracts.IBlockRepository;

	@inject(ApiDatabaseIdentifiers.TransactionRepository)
	private readonly transactionRepository!: ApiDatabaseContracts.ITransactionRepository;

	public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const pagination = this.getQueryPagination(request.query);

		const blocks = await this.blockRepository
			.createQueryBuilder()
			.select()
			.orderBy("height", "DESC")
			.offset(pagination.offset)
			.limit(pagination.limit)
			.getMany();

		const totalCount = blocks[0]?.height ?? 0;

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: blocks,
				totalCount,
			},
			BlockResource,
			false,
		);
	}

	public async transactions(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const pagination = this.getQueryPagination(request.query);

		const [transactions, totalCount] = await this.transactionRepository
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
			false,
		);
	}

	// public async first(request: Hapi.Request, h: Hapi.ResponseToolkit) {
	// 	const block = this.stateStore.getGenesisBlock();

	// 	if (request.query.transform) {
	// 		return this.respondWithResource(block, BlockWithTransactionsResource, true);
	// 	} else {
	// 		return this.respondWithResource(block.block.data, BlockResource, false);
	// 	}
	// }

	// public async last(request: Hapi.Request, h: Hapi.ResponseToolkit) {
	// 	const block = this.stateStore.getLastBlock();

	// 	if (request.query.transform) {
	// 		return this.respondWithResource(block, BlockWithTransactionsResource, true);
	// 	} else {
	// 		return this.respondWithResource(block.data, BlockResource, false);
	// 	}
	// }

	// public async show(request: Hapi.Request, h: Hapi.ResponseToolkit) {
	// 	const block = await this.getBlock(request.params.id);

	// 	if (!block) {
	// 		return notFound("Block not found");
	// 	}

	// 	if (request.query.transform) {
	// 		return this.respondWithResource(block, BlockWithTransactionsResource, true);
	// 	} else {
	// 		return this.respondWithResource(block.data, BlockResource, false);
	// 	}
	// }

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
}
