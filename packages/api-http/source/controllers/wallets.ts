import type { Types } from "@mainsail/api-common";

import Boom from "@hapi/boom";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
	Search,
	TypeOrm,
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

@injectable()
export class WalletsController extends Controller {
	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.TransactionRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TokenRepositoryFactory)
	private readonly tokenRepositoryFactory!: ApiDatabaseContracts.TokenRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TokenActionRepositoryFactory)
	private readonly tokenActionRepositoryFactory!: ApiDatabaseContracts.TokenActionRepositoryFactory;

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
			return [];
		}

		// Transactions
		const transactionsQuery = this.transactionRepositoryFactory()
			.createQueryBuilder("t")
			.leftJoin(Models.Token, "tok", `tok.address = t."to"`);

		transactionsQuery.andWhere(
			new TypeOrm.Brackets((b) => {
				b.where("t.from IN (:...addresses)", { addresses }).orWhere("t.to IN (:...addresses)", {
					addresses,
				});
			}),
		);

		const queryTransactions = transactionsQuery
			.clone()
			.select([
				't."hash" AS "transactionHash"',
				't."timestamp" AS "timestamp"',
				't."block_number" AS "blockNumber"',
				't."transaction_index" AS "transactionIndex"',
				'NULL AS "index"',
				't."from" AS "from"',
				't."to" AS "to"',
				't."value" AS "value"',
				'NULL AS "action"',
				'SUBSTRING(t."data" FROM 1 FOR 4) AS "functionSig"',

				'tok."address" AS "tokenAddress"',
				'tok."name" AS "tokenName"',
				'tok."symbol" AS "tokenSymbol"',
				'tok."decimals" AS "tokenDecimals"',
			])
			.orderBy("t.block_number", "DESC")
			.addOrderBy("t.transaction_index", "DESC");

		// Actions
		const tokenActionsQuery = this.tokenActionRepositoryFactory()
			.createQueryBuilder("ta")
			.innerJoin(Models.Token, "tok", "tok.address = ta.address");

		TokensController.andWhereWhitelisted(tokenActionsQuery, request);

		tokenActionsQuery.andWhere(
			new TypeOrm.Brackets((b) => {
				b.where("ta.from IN (:...addresses)", { addresses }).orWhere("ta.to IN (:...addresses)", {
					addresses,
				});
			}),
		);

		const queryTokenActions = tokenActionsQuery
			.clone()
			.select([
				'ta."transaction_hash" AS "transactionHash"',
				't."timestamp" AS "timestamp"',
				't."block_number" AS "blockNumber"',
				't."transaction_index" AS "transactionIndex"',
				'ta."index" AS "index"',
				'ta."from" AS "from"',
				'ta."to" AS "to"',
				'ta."value" AS "value"',
				'ta."action" AS "action"',
				'SUBSTRING(t."data" FROM 1 FOR 4) AS "functionSig"',

				'tok."address" AS "tokenAddress"',
				'tok."name" AS "tokenName"',
				'tok."symbol" AS "tokenSymbol"',
				'tok."decimals" AS "tokenDecimals"',
			])
			.innerJoin(Models.Transaction, "t", "t.hash = ta.transaction_hash")
			.orderBy("ta.block_number", "DESC")
			.addOrderBy("t.transaction_index", "DESC")
			.addOrderBy("ta.index", "DESC", "NULLS LAST");

		const parameters = {
			...queryTransactions.getParameters(),
			...queryTokenActions.getParameters(),
		};

		const unionCte = `(${queryTransactions.getQuery()})
						UNION ALL
					(${queryTokenActions.getQuery()})
				`;

		const [walletActivityRows, totalCountRow] = await Promise.all([
			this.dataSource
				.createQueryBuilder()
				.addCommonTableExpression(unionCte, "unioned")
				.select("u.*")
				.from("unioned", "u")
				.limit(pagination.limit)
				.offset(pagination.offset)
				.addOrderBy(`"blockNumber"`, "DESC")
				.addOrderBy(`"transactionIndex"`, "DESC")
				.addOrderBy(`"index"`, "DESC", "NULLS LAST")
				.setParameters({
					...parameters,
				})
				.getRawMany<WalletActivityRaw>(),
			this.dataSource
				.createQueryBuilder()
				.addCommonTableExpression(unionCte, "unioned")
				.select("COUNT(1)")
				.from("unioned", "u")
				.setParameters({
					...parameters,
				})
				.getRawOne(),
		]);

		const totalCount = Number(totalCountRow?.count ?? 0);
		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
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
			.where("th.address = :address", { address: walletAddress })
			.andWhere("th.balance / POW(10, tok.decimals) >= :minBalance", { minBalance });

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

			tokenHoldersQuery.clone().select("COUNT(DISTINCT th.address)", "cnt").getRawOne<{ cnt: string }>(),
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
