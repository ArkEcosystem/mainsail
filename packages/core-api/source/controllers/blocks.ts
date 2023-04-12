import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { notFound } from "@hapi/boom";
import Hapi from "@hapi/hapi";

import { BlockResource, BlockWithTransactionsResource, TransactionResource } from "../resources";
import { Controller } from "./controller";

@injectable()
export class BlocksController extends Controller {
	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.Database.Service)
	private readonly database!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const lastBlock = this.blockchain.getLastBlock();

		const offset = this.getOffset(request.query);

		const blocks = await this.database.findBlocksByHeightRange(
			lastBlock.data.height - offset - request.query.limit + 1,
			lastBlock.data.height - offset,
		);
		blocks.reverse();

		if (request.query.transform) {
			return this.toPagination(
				{
					meta: { totalCountIsEstimate: false },
					results: blocks,
					totalCount: lastBlock.data.height,
				},
				BlockWithTransactionsResource,
				true,
			);
		} else {
			return this.toPagination(
				{
					meta: { totalCountIsEstimate: false },
					results: blocks.map((block) => block.data),
					totalCount: lastBlock.data.height,
				},
				BlockResource,
				false,
			);
		}
	}

	public async first(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const block = this.stateStore.getGenesisBlock();

		if (request.query.transform) {
			return this.respondWithResource(block, BlockWithTransactionsResource, true);
		} else {
			return this.respondWithResource(block.data, BlockResource, false);
		}
	}

	public async last(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const block = this.blockchain.getLastBlock();

		if (request.query.transform) {
			return this.respondWithResource(block, BlockWithTransactionsResource, true);
		} else {
			return this.respondWithResource(block.data, BlockResource, false);
		}
	}

	public async show(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const block = await this.getBlock(request.params.id);

		if (!block) {
			return notFound("Block not found");
		}

		if (request.query.transform) {
			return this.respondWithResource(block, BlockWithTransactionsResource, true);
		} else {
			return this.respondWithResource(block.data, BlockResource, false);
		}
	}

	public async transactions(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const block = await this.getBlock(request.params.id);

		if (!block) {
			return notFound("Block not found");
		}

		const transactions = block.transactions.map((tx) => tx.data);

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: transactions.slice(
					this.getOffset(request.query),
					this.getOffset(request.query) + request.query.limit,
				),
				totalCount: block.transactions.length,
			},
			TransactionResource,
			request.query.transform,
		);
	}

	private async getBlock(idOrHeight: string): Promise<Contracts.Crypto.IBlock | undefined> {
		let block: Contracts.Crypto.IBlock | undefined;

		if (/^-?\d+$/.test(idOrHeight)) {
			const blocks = await this.database.findBlockByHeights([Number.parseInt(idOrHeight)]);

			if (blocks.length > 0) {
				block = blocks[0];
			}
		} else {
			block = await this.database.getBlock(idOrHeight);
		}

		return block;
	}
}
