import type { Types } from "@mainsail/api-common";

import Boom from "@hapi/boom";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
	TypeOrm,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { TokenHolderResource } from "../resources/token-holder.js";
import { TokenTransferResource } from "../resources/token-transfer.js";
import { TokenWhitelistResource } from "../resources/token-whitelist.js";
import { TokenResource } from "../resources/token.js";
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

	@inject(ApiDatabaseIdentifiers.TokenActionRepositoryFactory)
	private readonly tokenActionRepositoryFactory!: ApiDatabaseContracts.TokenActionRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TokenWhitelistRepositoryFactory)
	private readonly tokenWhitelistRepositoryFactory!: ApiDatabaseContracts.TokenWhitelistRepositoryFactory;

	public async index(request: Types.HapiRequest): Promise<object> {
		const pagination = this.getQueryPagination(request.query);

		const tokensQuery = this.tokenRepositoryFactory().createQueryBuilder("tok").select();

		TokensController.andWhereWhitelisted(tokensQuery, request);
		TokensController.andWhereNameSearch(tokensQuery, request.query.name);

		const [tokens, totalCount] = await TokensController.optionallyOrderedByName(
			tokensQuery.offset(pagination.offset).limit(pagination.limit),
			request.query.name,
		)
			.addOrderBy("tok.address", "ASC")
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

	public async show(request: Types.HapiRequest): Promise<object> {
		const token = await this.getToken(request.params.address);

		if (!token) {
			return Boom.notFound("Token not found");
		}

		return this.respondWithResource(token, TokenResource);
	}

	public async holders(request: Types.HapiRequest): Promise<object> {
		const token = await this.getToken(request.params.address);

		if (!token) {
			return Boom.notFound("Token not found");
		}

		const pagination = this.getQueryPagination(request.query);

		const [tokenHolders, totalCount] = await this.tokenHolderRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("token_address = :address", { address: request.params.address })
			.orderBy("balance", "DESC")
			.addOrderBy("address", "ASC")
			.offset(pagination.offset)
			.limit(pagination.limit)
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

	public async transfers(request: Types.HapiRequest): Promise<object> {
		return this.getTokenActions(Models.TokenActionEnum.Transfer, request);
	}

	public async tokenTransfers(request: Types.HapiRequest): Promise<object> {
		return this.getTokenActions(Models.TokenActionEnum.Transfer, request);
	}

	public async approvals(request: Types.HapiRequest): Promise<object> {
		return this.getTokenActions(Models.TokenActionEnum.Approval, request);
	}

	public async tokenApprovals(request: Types.HapiRequest): Promise<object> {
		return this.getTokenActions(Models.TokenActionEnum.Approval, request);
	}

	public async whitelist(request: Types.HapiRequest): Promise<object> {
		const pagination = this.getListingPage(request);
		const [tokenWhitelist, totalCount] = await this.tokenWhitelistRepositoryFactory()
			.createQueryBuilder()
			.select()
			.orderBy("address", "ASC")
			.limit(pagination.limit)
			.offset(pagination.offset)
			.getManyAndCount();

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: tokenWhitelist,
				totalCount,
			},
			TokenWhitelistResource,
		);
	}

	private async getTokenActions(action: Models.TokenActionEnum, request: Types.HapiRequest): Promise<object> {
		const pagination = this.getListingPage(request);
		const tokenActionsQuery = this.tokenActionRepositoryFactory()
			.createQueryBuilder("tf")
			.innerJoin(Models.Token, "tok", "tok.address = tf.address")
			.where("tf.action = :action", { action });

		TokensController.andWhereWhitelisted(tokenActionsQuery, request);

		if (request.params.address) {
			const token = await this.getToken(request.params.address);
			if (!token) {
				return Boom.notFound("Token not found");
			}

			tokenActionsQuery.andWhere("tf.address = :address", { address: request.params.address });
		}

		if (request.query.transactionHash) {
			tokenActionsQuery.andWhere("tf.transaction_hash = :transactionHash", {
				transactionHash: request.query.transactionHash,
			});
		}

		if (request.query.addresses) {
			const addresses = Array.isArray(request.query.addresses)
				? request.query.addresses
				: [request.query.addresses];

			tokenActionsQuery.andWhere(
				new TypeOrm.Brackets((b) => {
					b.where("tf.from IN (:...addresses)", { addresses }).orWhere("tf.to IN (:...addresses)", {
						addresses,
					});
				}),
			);
		} else {
			if (request.query.from) {
				const from = Array.isArray(request.query.from) ? request.query.from : [request.query.from];
				tokenActionsQuery.andWhere("tf.from IN (:...from)", { from });
			}

			if (request.query.to) {
				const to = Array.isArray(request.query.to) ? request.query.to : [request.query.to];
				tokenActionsQuery.andWhere("tf.to IN (:...to)", { to });
			}
		}

		const [tokenActionsRows, totalCountRow] = await Promise.all([
			tokenActionsQuery
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
				.orderBy("tf.block_number", "DESC")
				.addOrderBy("tf.index", "DESC")
				.limit(pagination.limit)
				.offset(pagination.offset)
				.getRawMany<TokenTransferRaw>(),

			tokenActionsQuery.clone().select("COUNT(1)", "cnt").getRawOne<{ cnt: string }>(),
		]);

		const totalCount = Number(totalCountRow?.cnt ?? 0);

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: tokenActionsRows.map((row) => ({
					/* eslint-disable perfectionist/sort-objects */
					transactionHash: row.transactionHash,
					from: row.from,
					to: row.to,
					value: row.value,
					functionSig: `0x${row.functionSig.toString("hex")}`,
					blockNumber: row.blockNumber,
					timestamp: row.timestamp,
					token: {
						address: row.tokenAddress,
						name: row.tokenName,
						symbol: row.tokenSymbol,
						decimals: row.tokenDecimals,
					},
					/* eslint-enable perfectionist/sort-objects */
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

	public static andWhereWhitelisted(
		queryBuilder: TypeOrm.SelectQueryBuilder<TypeOrm.ObjectLiteral>,
		request: Types.HapiRequest,
	): void {
		if (request.query.ignoreWhitelist) {
			return;
		}

		const toStringArray = (value: unknown): string[] => {
			if (!value) {
				return [];
			}

			return (Array.isArray(value) ? value : String(value).split(","))
				.map((v) => String(v).trim())
				.filter(Boolean);
		};

		const customWhitelist = toStringArray(request.query.whitelist);
		const customBlacklist = toStringArray(request.query.blacklist);

		if (customWhitelist.length === 0 && customBlacklist.length === 0) {
			queryBuilder.innerJoin(Models.TokenWhitelist, "tw", "tw.address = tok.address");
			return;
		}

		if (customWhitelist.length > 0) {
			queryBuilder.leftJoin(Models.TokenWhitelist, "tw", "tw.address = tok.address").andWhere(
				new TypeOrm.Brackets((qb) => {
					qb.where("tw.address IS NOT NULL").orWhere("tok.address IN (:...customWhitelist)", {
						customWhitelist,
					});
				}),
			);
		}

		if (customBlacklist.length > 0) {
			queryBuilder.andWhere("tok.address NOT IN (:...customBlacklist)", {
				customBlacklist,
			});
		}
	}

	public static andWhereNameSearch(
		queryBuilder: TypeOrm.SelectQueryBuilder<Models.TokenHolder | Models.Token>,
		nameQuery?: string,
	): void {
		const nameSearch = ((nameQuery as string) ?? "").trim();
		if (!nameSearch) {
			return;
		}

		const nameSearchLower = nameSearch.toLowerCase();
		const isShort = nameSearch.length > 0 && nameSearch.length <= 2;

		queryBuilder.andWhere(
			new TypeOrm.Brackets((b) => {
				if (isShort) {
					// For short queries, use the faster prefix index
					b.where("lower(tok.symbol) LIKE :prefix", { prefix: `${nameSearchLower}%` }).orWhere(
						"lower(tok.name) LIKE :prefix",
						{ prefix: `${nameSearchLower}%` },
					);
				} else {
					// Otherwise trigram index
					b.where("tok.symbol ILIKE :like", { like: `%${nameSearchLower}%` }).orWhere(
						"tok.name ILIKE :like",
						{ like: `%${nameSearchLower}%` },
					);
				}
			}),
		);
	}

	public static optionallyOrderedByName(
		queryBuilder: TypeOrm.SelectQueryBuilder<Models.TokenHolder | Models.Token>,
		nameQuery?: string,
	): TypeOrm.SelectQueryBuilder<Models.TokenHolder | Models.Token> {
		const nameSearch = ((nameQuery as string) ?? "").trim();
		if (!nameSearch) {
			return queryBuilder;
		}

		queryBuilder
			.addSelect(
				`CASE
			WHEN LOWER(tok.symbol) LIKE :orderByPrefix THEN 0
			WHEN LOWER(tok.name) LIKE :orderByPrefix THEN 1
			ELSE 2
    		END`,
				"search_rank",
			)
			.addOrderBy("search_rank", "ASC")
			.setParameter("orderByPrefix", `${nameSearch.toLowerCase()}%`);

		return queryBuilder;
	}
}
