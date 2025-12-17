import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { TokenResource } from "../resources/token.js";
import { TokenHolderResource } from "../resources/token-holder.js";
import { Controller } from "./controller.js";

@injectable()
export class TokensController extends Controller {
	@inject(ApiDatabaseIdentifiers.TokenRepositoryFactory)
	private readonly tokenRepositoryFactory!: ApiDatabaseContracts.TokenRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TokenHolderRepositoryFactory)
	private readonly tokenHolderRepositoryFactory!: ApiDatabaseContracts.TokenHolderRepositoryFactory;

	public async index(request: Hapi.Request): Promise<object> {
		const pagination = this.getQueryPagination(request.query);

		const [tokens, totalCount] = await this.tokenRepositoryFactory()
			.createQueryBuilder()
			.select()
			.offset(pagination.offset)
			.limit(pagination.limit)
			.getManyAndCount();

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: tokens,
				totalCount,
			},
			TokenResource,
		);
	}

	public async show(request: Hapi.Request): Promise<object> {
		const token = await this.getToken(request.params.address);

		if (!token) {
			return Boom.notFound("Token not found");
		}

		return this.respondWithResource(token, TokenResource);
	}

	public async holders(request: Hapi.Request): Promise<object> {
		const token = await this.getToken(request.params.address);

		if (!token) {
			return Boom.notFound("Token not found");
		}

		const [tokenHolders, totalCount] = await this.tokenHolderRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("token_address = :address", { address: request.params.address })
			.orderBy("balance", "DESC")
			.addOrderBy("address", "ASC")
			.getManyAndCount();

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: tokenHolders,
				totalCount,
			},
			TokenHolderResource,
		);
	}

	private async getToken(address: string): Promise<Models.Token | null> {
		return this.tokenRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("address = :address", { address })
			.getOne();
	}
}
