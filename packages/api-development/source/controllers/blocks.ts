import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import Boom from "@hapi/boom";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { BlockResource } from "../resources/index.js";
import { Controller } from "./controller.js";

@injectable()
export class BlocksController extends Controller {
	@inject(Identifiers.Database.Service)
	private readonly database!: Contracts.Database.DatabaseService;

	public async index(
		request: Types.HapiRequest,
	): Promise<Contracts.Api.ResultsPage<ReturnType<BlockResource["transform"]>> | Boom.Boom> {
		const lastBlock = this.stateStore.getLastBlock();

		const pagination = this.getQueryPagination(request.query);

		const blocks = await this.database.findBlocks(
			lastBlock.number - pagination.offset - pagination.limit + 1,
			lastBlock.number - pagination.offset,
		);
		blocks.reverse();

		return this.toPagination(
			{
				results: blocks,
				totalCount: lastBlock.number,
			},
			BlockResource,
		);
	}

	public async first(
		request: Types.HapiRequest,
	): Promise<{ data: ReturnType<BlockResource["transform"]> } | Boom.Boom> {
		const commit = this.stateStore.getGenesisCommit();

		return this.respondWithResource(commit.block, BlockResource);
	}

	public async last(
		request: Types.HapiRequest,
	): Promise<{ data: ReturnType<BlockResource["transform"]> } | Boom.Boom> {
		const block = this.stateStore.getLastBlock();
		return this.respondWithResource(block, BlockResource);
	}

	public async show(
		request: Types.HapiRequest,
	): Promise<{ data: ReturnType<BlockResource["transform"]> } | Boom.Boom> {
		const block = await this.getBlock(request.params.id);

		if (!block) {
			return Boom.notFound("Block not found");
		}

		return this.respondWithResource(block, BlockResource);
	}

	// TODO: Support block number only
	private async getBlock(idOrBlockNumber: string): Promise<Contracts.Crypto.Block | undefined> {
		return await this.database.getBlock(Number.parseInt(idOrBlockNumber));
	}
}
