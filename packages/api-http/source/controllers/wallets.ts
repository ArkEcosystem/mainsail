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
import { EnrichedWallet, WalletResource } from "../resources/wallet.js";
import { Controller } from "./controller.js";

@injectable()
export class WalletsController extends Controller {
	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.TransactionRepositoryFactory;

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

		if (wallet) {
			(wallet as EnrichedWallet).tokenCount = await this.getTokenCount(wallet.address);
		}

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

		const rows = await this.tokenHolderRepositoryFactory()
			.createQueryBuilder()
			.select(["token_address AS token", "address", "balance"])
			.where("address IN (:...wallets)", { wallets: walletAddresses })
			.andWhere("balance > 0")
			.addOrderBy("token", "ASC")
			.addOrderBy("balance", "DESC")
			.addOrderBy("address", "ASC")
			.getRawMany<{ token: string; address: string; balance: string }>();

		// [
		//   { token: "0xabc", wallet: "0xa", balance: "12000000" },
		//   { token: "0xabc", wallet: "0xb", balance: "10000000" },
		//   ...
		// ]
		const result = Object.entries(
			rows.reduce<Record<string, Record<string, string>>>((accumulator, r) => {
				const token = r.token;
				const wallet = r.address;
				const balance = r.balance;

				if (!accumulator[token]) {
					accumulator[token] = {};
				}

				accumulator[token][wallet] = balance;

				return accumulator;
			}, {}),
		).map(([token, addresses]) => ({ addresses, token }));

		// [
		//   {
		//     addresses: { "0xa": 12000000, "0xb": 10000000 }
		//     token: "0xabc",
		//   }
		// ]

		return { data: result };
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

	private async getTokenCount(address: string): Promise<number> {
		const tokenCount = await this.tokenHolderRepositoryFactory()
			.createQueryBuilder()
			.where("address = :address", { address })
			.getCount();

		return tokenCount;
	}
}
