import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
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

@injectable()
export class WalletsController extends Controller {
	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.TransactionRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TokenRepositoryFactory)
	private readonly tokenRepositoryFactory!: ApiDatabaseContracts.TokenRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TokenHolderRepositoryFactory)
	private readonly tokenHolderRepositoryFactory!: ApiDatabaseContracts.TokenHolderRepositoryFactory;

	public async index(request: Hapi.Request): Promise<object> {
		const criteria: Search.Criteria.WalletCriteria = request.query;
		const pagination = this.getQueryPagination(request.query);
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions(request);

		const wallets = await this.walletRepositoryFactory().findManyByCriteria(criteria, sorting, pagination, options);

		return this.toPagination(wallets, WalletResource);
	}

	public async top(request: Hapi.Request): Promise<object> {
		const criteria: Search.Criteria.WalletCriteria = request.query;
		const pagination = this.getQueryPagination(request.query);
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions(request);

		const wallets = await this.walletRepositoryFactory().findManyByCriteria(criteria, sorting, pagination, options);

		return this.toPagination(wallets, WalletResource);
	}

	public async show(request: Hapi.Request): Promise<object> {
		const walletId = request.params.id as string;

		const wallet = await this.getWallet(walletId);

		return this.respondWithResource(wallet, WalletResource);
	}

	public async transactions(request: Hapi.Request): Promise<object> {
		const walletId = request.params.id as string;

		const wallet = await this.getWallet(walletId);
		if (!wallet) {
			return Boom.notFound("Wallet not found");
		}

		return this.getTransactions(request, { address: wallet.address });
	}

	public async transactionsSent(request: Hapi.Request): Promise<object> {
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

	public async transactionsReceived(request: Hapi.Request): Promise<object> {
		const walletId = request.params.id as string;

		const wallet = await this.getWallet(walletId);
		if (!wallet) {
			return Boom.notFound("Wallet not found");
		}

		return this.getTransactions(request, { to: wallet.address });
	}

	public async votes(request: Hapi.Request): Promise<object> {
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

	public async tokens(request: Hapi.Request): Promise<object> {
		const walletAddresses = Array.isArray(request.query.addresses)
			? request.query.addresses
			: [request.query.addresses];

		const pagination = this.getListingPage(request);

		const tokenPaginatedQuery = this.tokenRepositoryFactory()
			.createQueryBuilder("t")
			.where(
				`EXISTS (
					SELECT 1
					FROM token_holders th
					WHERE th.token_address = t.address
						AND th.address IN (:...addresses)
						AND th.balance > 0
					LIMIT 1
	    	)`,
				{ addresses: walletAddresses },
			);

		const [pageTokensRows, totalCountRow] = await Promise.all([
			tokenPaginatedQuery
				.clone()
				.select([
					"t.address AS token",
					"t.symbol AS symbol",
					"t.name AS name",
					"t.decimals AS decimals",
					"t.total_supply AS supply",
				])
				.offset(pagination.offset)
				.limit(pagination.limit)
				.orderBy("t.address", "ASC")
				.getRawMany<TokenMetadata>(),

			tokenPaginatedQuery.clone().select("COUNT(DISTINCT t.address)", "cnt").getRawOne<{ cnt: string }>(),
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
			.where("th.address IN (:...addresses)", { addresses: walletAddresses })
			.andWhere("th.balance > 0")
			.andWhere("th.token_address IN (:...tokenAddresses)", {
				tokenAddresses: Object.keys(tokenMetadata),
			})
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

	public async tokensShow(request: Hapi.Request): Promise<object> {
		const walletId = request.params.id as string;

		const wallet = await this.getWallet(walletId);
		if (!wallet) {
			return Boom.notFound("Wallet not found");
		}

		return this.getTokens(request, wallet);
	}

	private async getTransactions(request: Hapi.Request, criteria: Search.Criteria.TransactionCriteria) {
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
			await this.enrichTransactionResult(transactions, { fullReceipt: request.query.fullReceipt }),
			TransactionResource,
		);
	}

	private async getTokens(request: Hapi.Request, wallet: Models.Wallet) {
		const pagination = this.getListingPage(request);

		const [tokens, totalCount] = await this.tokenHolderRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("address = :address", { address: wallet.address })
			.offset(pagination.offset)
			.limit(pagination.limit)
			.getManyAndCount();

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: tokens,
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
