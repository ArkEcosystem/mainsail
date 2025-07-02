import { notFound } from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { BlockResource } from "../resources/index.js";
import { Controller } from "./controller.js";

@injectable()
export class BlocksController extends Controller {
	@inject(Identifiers.Database.Service)
	private readonly database!: Contracts.Database.DatabaseService;

	public async index(request: Hapi.Request) {
		const lastBlock = this.stateStore.getLastBlock();

		const pagination = this.getQueryPagination(request.query);

		const blocks = await this.database.findBlocks(
			lastBlock.data.number - pagination.offset - pagination.limit + 1,
			lastBlock.data.number - pagination.offset,
		);
		blocks.reverse();

		return this.toPagination(
			{
				results: blocks,
				totalCount: lastBlock.data.number,
			},
			BlockResource,
		);
	}

	public async first(request: Hapi.Request) {
		const commit = this.stateStore.getGenesisCommit();

		return this.respondWithResource(commit.block, BlockResource);
	}

	public async last(request: Hapi.Request) {
		const block = this.stateStore.getLastBlock();
		return this.respondWithResource(block, BlockResource);
	}

	public async show(request: Hapi.Request) {
		const block = await this.getBlock(request.params.id);

		if (!block) {
			return notFound("Block not found");
		}

		return this.respondWithResource(block, BlockResource);
	}

	// TODO: Support block number only
	private async getBlock(idOrBlockNumber: string): Promise<Contracts.Crypto.Block | undefined> {
		return await this.database.getBlock(Number.parseInt(idOrBlockNumber));
	}
}
