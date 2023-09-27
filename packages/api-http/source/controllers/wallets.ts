import Hapi from "@hapi/hapi";
import Boom from "@hapi/boom";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers, Models, Search } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { WalletResource } from "../resources/wallet";
import { Controller } from "./controller";
import { TransactionResource } from "../resources";

@injectable()
export class WalletsController extends Controller {
	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.ITransactionRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.WalletRepositoryFactory)
	private readonly walletRepositoryFactory!: ApiDatabaseContracts.IWalletRepositoryFactory;

	public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const criteria: Search.Criteria.WalletCriteria = request.query;
		const pagination = this.getQueryPagination(request.query);
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions();

		const wallets = await this.walletRepositoryFactory().findManyByCritera(
			criteria,
			sorting,
			pagination,
			options
		);

		return this.toPagination(wallets, WalletResource, request.query.transform);
	}

	public async top(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const criteria: Search.Criteria.WalletCriteria = request.query;
		const pagination = this.getQueryPagination(request.query);
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions();

		const wallets = await this.walletRepositoryFactory().findManyByCritera(
			criteria,
			sorting,
			pagination,
			options
		);

		return this.toPagination(wallets, WalletResource, request.query.transform);
	}

	public async show(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const walletId = request.params.id as string;

		const wallet = await this.getWallet(walletId);

		return this.toResource(wallet, WalletResource, request.params.transform);
	}

	public async transactions(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const walletId = request.params.id as string;

		const wallet = await this.getWallet(walletId);
		if (!wallet) {
			return Boom.notFound("Wallet not found");
		}

		return this.getTransactions(request, { address: wallet.address });
	}

	public async transactionsSent(request: Hapi.Request, h: Hapi.ResponseToolkit) {
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

	public async transactionsReceived(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const walletId = request.params.id as string;

		const wallet = await this.getWallet(walletId);
		if (!wallet) {
			return Boom.notFound("Wallet not found");
		}

		return this.getTransactions(request, { recipientId: wallet.address });
	}

	public async votes(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const walletId = request.params.id as string;

		const wallet = await this.getWallet(walletId);
		if (!wallet) {
			return Boom.notFound("Wallet not found");
		}

		if (!wallet.publicKey) {
			return this.getEmptyPage();
		}

		return this.getTransactions(request, {
			typeGroup: Contracts.Crypto.TransactionTypeGroup.Core,
			type: Contracts.Crypto.TransactionType.Vote,
			senderPublicKey: wallet.publicKey,
		});
	}

	private async getTransactions(request: Hapi.Request, criteria: Search.Criteria.TransactionCriteria) {
		const pagination = this.getListingPage(request);
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions();

		const transactions = await this.transactionRepositoryFactory().findManyByCritera(
			this.walletRepositoryFactory(),
			{
				...request.query,
				...criteria,
			},
			sorting,
			pagination,
			options,
		);

		return this.toPagination(transactions, TransactionResource, request.query.transform);
	}

	private async getWallet(walletId: string): Promise<Models.Wallet | null> {
		return this.walletRepositoryFactory().
			createQueryBuilder()
			.select()
			.where("address = :address", { address: walletId })
			.orWhere("public_key = :publicKey", { publicKey: walletId })
			.orWhere("attributes @> :validatorUsername", { validatorUsername: { validatorUsername: walletId } })
			.getOne();
	}
}