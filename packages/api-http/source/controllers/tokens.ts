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
import { TokenTransferResource } from "../resources/token-transfer.js";
import { Controller } from "./controller.js";

type TokenTransferRaw = {
	transactionHash: string;
	from: string;
	to: string;
	functionSig: Buffer;
	value: string;
	blockNumber: string;
	timestamp: string;

	tokenAddress: string;
	tokenSymbol: string;
	tokenName: string;
	tokenDecimals: number;
};

@injectable()
export class TokensController extends Controller {
	@inject(ApiDatabaseIdentifiers.TokenRepositoryFactory)
	private readonly tokenRepositoryFactory!: ApiDatabaseContracts.TokenRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TokenHolderRepositoryFactory)
	private readonly tokenHolderRepositoryFactory!: ApiDatabaseContracts.TokenHolderRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TokenTransferRepositoryFactory)
	private readonly tokenTransferRepositoryFactory!: ApiDatabaseContracts.TokenTransferRepositoryFactory;

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

	public async transfers(request: Hapi.Request): Promise<object> {
		return this.getTokenTransfers(request);
	}

	public async tokenTransfers(request: Hapi.Request): Promise<object> {
		return this.getTokenTransfers(request);
	}

	private async getTokenTransfers(request: Hapi.Request): Promise<object> {
		const pagination = this.getListingPage(request);
		const tokenTransfersQuery = this.tokenTransferRepositoryFactory().createQueryBuilder("tf");

		if (request.params.address) {
			const token = await this.getToken(request.params.address);
			if (!token) {
				return Boom.notFound("Token not found");
			}

			tokenTransfersQuery.where("tf.address = :address", { address: request.params.address });
		}

		if (request.query.from) {
			const from = Array.isArray(request.query.from) ? request.query.from : [request.query.from];
			tokenTransfersQuery.andWhere("tf.from IN (:...from)", { from });
		}

		if (request.query.to) {
			const to = Array.isArray(request.query.to) ? request.query.to : [request.query.to];
			tokenTransfersQuery.andWhere("tf.to IN (:...to)", { to });
		}

		const [tokenTranfersRows, totalCountRow] = await Promise.all([
			tokenTransfersQuery
				.clone()
				.select([
					'tf."from" AS "from"',
					'tf."to" AS "to"',
					'tf."transaction_hash" AS "transactionHash"',
					'tf."value" AS "value"',
					'SUBSTRING(t."data" FROM 1 FOR 4) AS "functionSig"',
					't."block_number" AS "blockNumber"',
					't."timestamp" AS "timestamp"',

					'tok."address" AS "tokenAddress"',
					'tok."name" AS "tokenName"',
					'tok."symbol" AS "tokenSymbol"',
					'tok."decimals" AS "tokenDecimals"',
				])
				.innerJoin(Models.Transaction, "t", "t.hash = tf.transaction_hash")
				.innerJoin(Models.Token, "tok", "tok.address = tf.address")
				.orderBy("tf.block_number", "DESC")
				.addOrderBy("tf.index", "DESC")
				.limit(pagination.limit)
				.offset(pagination.offset)
				.getRawMany<TokenTransferRaw>(),

			tokenTransfersQuery.clone().select("COUNT(1)", "cnt").getRawOne<{ cnt: string }>(),
		]);

		const totalCount = Number(totalCountRow?.cnt ?? 0);

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: tokenTranfersRows.map((transfer) => ({
					/* eslint-disable sort-keys-fix/sort-keys-fix */
					transactionHash: transfer.transactionHash,
					from: transfer.from,
					to: transfer.to,
					value: transfer.value,
					functionSig: `0x${transfer.functionSig.toString("hex")}`,
					blockNumber: transfer.blockNumber,
					timestamp: transfer.timestamp,
					token: {
						address: transfer.tokenAddress,
						name: transfer.tokenName,
						symbol: transfer.tokenSymbol,
						decimals: transfer.tokenDecimals,
					},
					/* eslint-enable sort-keys-fix/sort-keys-fix */
				})),
				totalCount,
			},
			TokenTransferResource,
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
