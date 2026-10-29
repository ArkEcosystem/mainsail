import type { Types } from "@mainsail/api-common";

import Boom from "@hapi/boom";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
	Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { FunctionSigs } from "@mainsail/evm-contracts";

import { TransactionResource } from "../resources/index.js";
import { TokenHolderResource } from "../resources/token-holder.js";
import { WalletResource } from "../resources/wallet.js";
import { Controller } from "./controller.js";
import { TokensController } from "./tokens.js";

type TokenHolderRaw = {
	token: string;
	address: string;
	balance: string;
};

type TokenMetadata = {
	token: string;
	symbol: string;
	name: string;
	decimals: number;
	supply: string;
};

type WalletActivityRaw = {
	transactionHash: string;
	blockNumber: number;
	transactionIndex: number;
	index: number;
	timestamp: number;
	from: string;
	to: string;
	value: string;
	functionSig: Buffer;
	action?: string;

	tokenAddress?: string;
	tokenName?: string;
	tokenSymbol?: string;
	tokenDecimals?: number;
};

const toList = (value: unknown): string[] => ([value ?? []].flat() as string[]).map((v) => v.trim()).filter(Boolean);

// what the addresses sent is read by their from-branches only, so the branches never overlap
const notSentByAddresses = (alias: string, direction: "from" | "to") =>
	direction === "to" ? `AND ${alias}."from" <> ALL($1::citext[])` : "";

const transactionBranch = (direction: "from" | "to", depth: number) => `
	SELECT x.* FROM addresses CROSS JOIN LATERAL (
		SELECT t.hash, t.block_number, t.transaction_index FROM transactions t
		WHERE t."${direction}" = addresses.address ${notSentByAddresses("t", direction)}
		ORDER BY t.timestamp DESC, t.transaction_index DESC LIMIT ${depth}
	) x`;

// only the parameters a filter refers to are passed, as Postgres cannot type unused ones
const getActivityTokenFilter = (
	request: Types.HapiRequest,
): { condition: string; parameters: string[][]; tokens: string } => {
	const whitelist = toList(request.query.whitelist);
	const blacklist = toList(request.query.blacklist);
	const isToken = "AND EXISTS (SELECT 1 FROM tokens WHERE tokens.address = ta.address)";

	if (request.query.ignoreWhitelist) {
		return { condition: isToken, parameters: [], tokens: "" };
	}

	if (whitelist.length === 0 && blacklist.length > 0) {
		return { condition: `${isToken} AND ta.address <> ALL($2::citext[])`, parameters: [blacklist], tokens: "" };
	}

	return {
		condition: "AND ta.address = listed.address",
		parameters: [whitelist, blacklist],
		tokens: `CROSS JOIN (
			SELECT address FROM tokens
			WHERE address IN (SELECT address FROM token_whitelist UNION SELECT unnest($2::citext[]))
				AND address <> ALL($3::citext[])
		) listed`,
	};
};

@injectable()
export class WalletsController extends Controller {
	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.TransactionRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TokenRepositoryFactory)
	private readonly tokenRepositoryFactory!: ApiDatabaseContracts.TokenRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TokenHolderRepositoryFactory)
	private readonly tokenHolderRepositoryFactory!: ApiDatabaseContracts.TokenHolderRepositoryFactory;

	public async index(request: Types.HapiRequest): Promise<object> {
		const criteria: Search.Criteria.WalletCriteria = request.query;
		const pagination = this.getQueryPagination(request.query);
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions(request);

		const wallets = await this.walletRepositoryFactory().findManyByCriteria(criteria, sorting, pagination, options);

		return this.toPagination(wallets, WalletResource);
	}

	public async top(request: Types.HapiRequest): Promise<object> {
		const criteria: Search.Criteria.WalletCriteria = request.query;
		const pagination = this.getQueryPagination(request.query);
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions(request);

		const wallets = await this.walletRepositoryFactory().findManyByCriteria(criteria, sorting, pagination, options);

		return this.toPagination(wallets, WalletResource);
	}

	public async show(request: Types.HapiRequest): Promise<object> {
		const walletId = request.params.id as string;

		const wallet = await this.getWallet(walletId);

		return this.respondWithResource(wallet, WalletResource);
	}

	public async transactions(request: Types.HapiRequest): Promise<object> {
		const walletId = request.params.id as string;

		const wallet = await this.getWallet(walletId);
		if (!wallet) {
			return Boom.notFound("Wallet not found");
		}

		return this.getTransactions(request, { address: wallet.address });
	}

	public async transactionsSent(request: Types.HapiRequest): Promise<object> {
		const walletId = request.params.id as string;

		const wallet = await this.getWallet(walletId);
		if (!wallet) {
			return Boom.notFound("Wallet not found");
		}

		if (!wallet.publicKey) {
			return this.getEmptyPage();
		}

		return this.getTransactions(request, { senderPublicKey: wallet.publicKey });
	}

	public async transactionsReceived(request: Types.HapiRequest): Promise<object> {
		const walletId = request.params.id as string;

		const wallet = await this.getWallet(walletId);
		if (!wallet) {
			return Boom.notFound("Wallet not found");
		}

		return this.getTransactions(request, { to: wallet.address });
	}

	public async votes(request: Types.HapiRequest): Promise<object> {
		const walletId = request.params.id as string;

		const wallet = await this.getWallet(walletId);
		if (!wallet) {
			return Boom.notFound("Wallet not found");
		}

		if (!wallet.publicKey) {
			return this.getEmptyPage();
		}

		return this.getTransactions(request, {
			data: FunctionSigs.ConsensusV1.Vote,
			senderPublicKey: wallet.publicKey,
		});
	}

	public async tokens(request: Types.HapiRequest): Promise<object> {
		if (!request.query.addresses) {
			return this.getEmptyPage();
		}

		const walletAddresses = Array.isArray(request.query.addresses)
			? request.query.addresses
			: [request.query.addresses];

		const minBalance =
			request.query.minBalance ?? this.apiConfiguration.getRequired("tokens.defaultMinimumBalance");
		const pagination = this.getListingPage(request);

		const tokenPaginatedQuery = this.tokenRepositoryFactory()
			.createQueryBuilder("tok")
			.where(
				`EXISTS (
					SELECT 1
					FROM token_holders th
					WHERE th.token_address = tok.address
						AND th.address IN (:...addresses)
						AND th.balance / POW(10, tok.decimals) >= :minBalance
					LIMIT 1
	    	)`,
				{ addresses: walletAddresses, minBalance },
			);

		TokensController.andWhereWhitelisted(tokenPaginatedQuery, request);
		TokensController.andWhereNameSearch(tokenPaginatedQuery, request.query.name);

		const [pageTokensRows, totalCountRow] = await Promise.all([
			TokensController.optionallyOrderedByName(
				tokenPaginatedQuery
					.clone()
					.select([
						"tok.address AS token",
						"tok.symbol AS symbol",
						"tok.name AS name",
						"tok.decimals AS decimals",
						"tok.total_supply AS supply",
					])
					.offset(pagination.offset)
					.limit(pagination.limit),
				request.query.name,
			)
				.addOrderBy("tok.address", "ASC")
				.getRawMany<TokenMetadata>(),

			tokenPaginatedQuery.clone().select("COUNT(DISTINCT tok.address)", "cnt").getRawOne<{ cnt: string }>(),
		]);

		const tokenMetadata = pageTokensRows.reduce<Record<string, TokenMetadata>>(
			(accumulator, row: TokenMetadata) => {
				if (!accumulator[row.token]) {
					delete row["search_rank"];
					accumulator[row.token] = row;
				}

				return accumulator;
			},
			{},
		);

		const totalCount = Number(totalCountRow?.cnt ?? 0);

		const tokenHoldersQuery = this.tokenHolderRepositoryFactory()
			.createQueryBuilder("th")
			.select(["th.token_address AS token", "th.address AS address", "th.balance AS balance"])
			.innerJoin(Models.Token, "tok", "tok.address = th.token_address")
			.where("th.address IN (:...addresses)", { addresses: walletAddresses })
			.andWhere("th.token_address IN (:...tokenAddresses)", {
				tokenAddresses: Object.keys(tokenMetadata),
			})
			.andWhere("th.balance / POW(10, tok.decimals) >= :minBalance", { minBalance })
			.orderBy("th.token_address", "ASC")
			.addOrderBy("th.balance", "DESC")
			.addOrderBy("th.address", "ASC");

		const rows = Object.keys(tokenMetadata).length > 0 ? await tokenHoldersQuery.getRawMany<TokenHolderRaw>() : [];

		// [
		//   {
		//     token: "0xabc",
		//     wallet: "0xa",
		//     balance: "12000000",
		//     symbol: "USDC",
		//     name: "USD Coin",
		//	   decimals: 6,
		//     supply: "1000000000000000"
		//   },
		//   {
		//     token: "0xabc",
		//     wallet: "0xb",
		//     balance: "10000000",
		//     symbol: "USDC",
		//     name: "USD Coin",
		//	   decimals: 6,
		//     supply: "1000000000000000"
		//   },
		//   ...
		// ]
		for (const row of rows) {
			const metadata = tokenMetadata[row.token];
			if (!("addresses" in metadata)) {
				metadata["addresses"] = {};
			}

			metadata["addresses"][row.address] = row.balance;
		}

		// [
		// 	{
		// 		token: "0xabc",
		// 		symbol: "USDC",
		// 		name: "USD Coin",
		// 		supply: "1000000000000000",
		//      decimals: 6,
		// 		addresses: { "0xa": 12000000, "0xb": 10000000 },
		// 	},
		// ];
		return this.toPagination(
			{ meta: { totalCountIsEstimate: false }, results: Object.values(tokenMetadata), totalCount },
			TokenHolderResource,
		);
	}

	public async tokensShow(request: Types.HapiRequest): Promise<object> {
		const walletId = request.params.id as string;
		const wallet = await this.getWallet(walletId);
		return this.getTokens(request, wallet?.address ?? walletId);
	}

	public async activity(request: Types.HapiRequest): Promise<object> {
		const pagination = this.getListingPage(request);

		const addresses = Array.isArray(request.query.addresses) ? request.query.addresses : [request.query.addresses];

		if (addresses.length === 0) {
			return this.getEmptyPage();
		}

		const depth = pagination.offset + pagination.limit;
		const { parameters, sql } = this.getActivityQuery(request, addresses);

		const [walletActivityRows, totalCountRow] = await Promise.all([
			this.dataSource.query<WalletActivityRaw[]>(
				`${sql(depth)},
				page_token_actions AS (
					-- the whole last block is kept, as its actions are ordered by transaction index only after the join
					SELECT
						ta.transaction_hash, ta.block_number, t.transaction_index, ta.index, ta.address, ta.action,
						ta."from", ta."to", ta.value
					FROM token_action_keys ta JOIN transactions t ON t.hash = ta.transaction_hash
					WHERE ta.block_number >= COALESCE(
						(SELECT block_number FROM token_action_keys ORDER BY block_number DESC OFFSET ${depth - 1} LIMIT 1),
						0
					)
				),
				page AS (
					SELECT
						hash AS transaction_hash, block_number, transaction_index, NULL::smallint AS "index",
						NULL::citext AS address, NULL::token_action_enum AS action, NULL::citext AS "from",
						NULL::citext AS "to", NULL::numeric AS value
					FROM transaction_keys
					UNION ALL
					SELECT * FROM page_token_actions
					ORDER BY block_number DESC, transaction_index DESC, "index" DESC NULLS LAST
					LIMIT ${pagination.limit} OFFSET ${pagination.offset}
				)
				-- sender, recipient and value of a token action are never null
				SELECT
					page.transaction_hash AS "transactionHash", t.timestamp AS "timestamp",
					page.block_number AS "blockNumber", page.transaction_index AS "transactionIndex",
					page.index AS "index", COALESCE(page."from", t."from") AS "from", COALESCE(page."to", t."to") AS "to",
					COALESCE(page.value, t.value) AS "value", page.action AS "action",
					SUBSTRING(t.data FROM 1 FOR 4) AS "functionSig", tok.address AS "tokenAddress",
					tok.name AS "tokenName", tok.symbol AS "tokenSymbol", tok.decimals AS "tokenDecimals"
				FROM page
				JOIN transactions t ON t.hash = page.transaction_hash
				LEFT JOIN tokens tok ON tok.address = COALESCE(page.address, t."to")
				ORDER BY page.block_number DESC, page.transaction_index DESC, page.index DESC NULLS LAST`,
				parameters,
			),
			this.dataSource.query<{ count: string }[]>(
				`${sql(10_001)}
				SELECT COUNT(*) AS count FROM (
					SELECT hash FROM transaction_keys UNION ALL SELECT transaction_hash FROM token_action_keys LIMIT 10001
				) activity`,
				parameters,
			),
		]);

		const totalCount = Number(totalCountRow[0]?.count ?? 0);
		return this.toPagination(
			{
				meta: { totalCountIsEstimate: totalCount > 10_000 },
				results: walletActivityRows.map((row) => ({
					/* eslint-disable perfectionist/sort-objects */
					blockNumber: row.blockNumber,
					transactionHash: row.transactionHash,
					transactionIndex: row.transactionIndex,
					timestamp: row.timestamp,
					from: row.from,
					to: row.to,
					value: row.value,
					functionSig: `0x${row.functionSig.toString("hex")}`,
					action: row.action,
					actionIndex: row.index,
					token: row.tokenAddress
						? {
								address: row.tokenAddress,
								name: row.tokenName,
								symbol: row.tokenSymbol,
								decimals: row.tokenDecimals,
							}
						: undefined,
					/* eslint-enable perfectionist/sort-objects */
				})),
				totalCount,
			},
			WalletResource,
		);
	}

	private getActivityQuery(
		request: Types.HapiRequest,
		addresses: string[],
	): { parameters: unknown[]; sql: (depth: number) => string } {
		const { condition, parameters, tokens } = getActivityTokenFilter(request);

		const tokenActionBranch = (direction: "from" | "to", depth: number) => `
			SELECT x.* FROM addresses ${tokens} CROSS JOIN unnest(enum_range(NULL::token_action_enum)) actions(action)
			CROSS JOIN LATERAL (
				SELECT ta.transaction_hash, ta.address, ta.action, ta.block_number, ta.index, ta."from", ta."to", ta.value
				FROM token_actions ta
				WHERE ta.action = actions.action ${condition}
					AND ta."${direction}" = addresses.address ${notSentByAddresses("ta", direction)}
				ORDER BY ta.block_number DESC, ta.index DESC LIMIT ${depth}
			) x`;

		return {
			parameters: [addresses, ...parameters],
			sql: (depth: number) => `
				WITH addresses AS (SELECT DISTINCT unnest($1::citext[]) AS address),
				transaction_keys AS (${transactionBranch("from", depth)} UNION ALL ${transactionBranch("to", depth)}),
				token_action_keys AS (${tokenActionBranch("from", depth)} UNION ALL ${tokenActionBranch("to", depth)})`,
		};
	}

	private async getTransactions(request: Types.HapiRequest, criteria: Search.Criteria.TransactionCriteria) {
		const pagination = this.getListingPage(request);
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions(request);

		const transactions = await this.transactionRepositoryFactory().findManyByCriteria(
			this.walletRepositoryFactory(),
			{
				...request.query,
				...criteria,
			},
			sorting,
			pagination,
			options,
		);

		return this.toPagination(
			await this.enrichTransactionResult(transactions, {
				fullReceipt: request.query.fullReceipt,
				includeTokens: request.query.includeTokens,
			}),
			TransactionResource,
		);
	}

	private async getTokens(request: Types.HapiRequest, walletAddress: string) {
		const pagination = this.getListingPage(request);
		const minBalance =
			request.query.minBalance ?? this.apiConfiguration.getRequired("tokens.defaultMinimumBalance");

		const tokenHoldersQuery = this.tokenHolderRepositoryFactory()
			.createQueryBuilder("th")
			.innerJoin(Models.Token, "tok", "tok.address = th.token_address")
			.where("th.address = :address", { address: walletAddress });

		if (request.query.tokenAddress) {
			tokenHoldersQuery.andWhere("th.token_address = :tokenAddress", {
				tokenAddress: request.query.tokenAddress,
			});
		}

		tokenHoldersQuery.andWhere("th.balance / POW(10, tok.decimals) >= :minBalance", { minBalance });

		TokensController.andWhereWhitelisted(tokenHoldersQuery, request);
		TokensController.andWhereNameSearch(tokenHoldersQuery, request.query.name);

		const [pageTokenHolderRows, totalCountRow] = await Promise.all([
			TokensController.optionallyOrderedByName(
				tokenHoldersQuery
					.clone()
					.select([
						`th.token_address AS "tokenAddress"`,
						"th.address AS address",
						"th.balance AS balance",
						"tok.name AS name",
						"tok.symbol AS symbol",
						"tok.decimals AS decimals",
						"tok.total_supply AS supply",
					])
					.offset(pagination.offset)
					.limit(pagination.limit),
				request.query.name,
			)
				.addOrderBy("th.token_address", "ASC")
				.addOrderBy("th.balance", "DESC")
				.addOrderBy("th.address", "ASC")
				.getRawMany(),

			tokenHoldersQuery.clone().select("COUNT(*)", "cnt").getRawOne<{ cnt: string }>(),
		]);

		const totalCount = Number(totalCountRow?.cnt ?? 0);

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: pageTokenHolderRows,
				totalCount,
			},
			TokenHolderResource,
		);
	}

	private async getWallet(walletId: string): Promise<Models.Wallet | null> {
		return this.walletRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("address = :address", { address: walletId })
			.orWhere("public_key = :publicKey", { publicKey: walletId })
			.orWhere("attributes @> :username", { username: { username: walletId } })
			.getOne();
	}
}
