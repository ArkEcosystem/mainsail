import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
	Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { BlockResource, DelegateResource, WalletResource } from "../resources";
import { delegateCriteriaSchemaObject, walletCriteriaSchemaObject } from "../schemas";
import { Controller } from "./controller";

@injectable()
export class DelegatesController extends Controller {
	@inject(ApiDatabaseIdentifiers.BlockRepositoryFactory)
	private readonly blockRepositoryFactory!: ApiDatabaseContracts.IBlockRepositoryFactory;

	public async index(request: Hapi.Request) {
		const pagination = this.getQueryPagination(request.query);
		const sorting = this.getListingOrder(request);
		const criteria = this.getQueryCriteria(
			request.query,
			delegateCriteriaSchemaObject,
		) as Search.Criteria.DelegateCriteria;
		const options = this.getListingOptions();

		const wallets = await this.walletRepositoryFactory().findManyDelegatesByCritera(
			criteria,
			sorting,
			pagination,
			options,
		);

		return this.toPagination(wallets, DelegateResource, request.query.transform);
	}

	public async show(request: Hapi.Request) {
		const walletId = request.params.id as string;

		const delegate = await this.getWallet(walletId);
		if (!delegate) {
			return Boom.notFound("Delegate not found");
		}

		return this.toResource(delegate, DelegateResource, request.params.transform);
	}

	public async voters(request: Hapi.Request) {
		const walletId = request.params.id as string;

		const delegate = await this.getWallet(walletId);
		if (!delegate) {
			return Boom.notFound("Delegate not found");
		}

		const pagination = this.getQueryPagination(request.query);
		const sorting = this.getListingOrder(request);
		const criteria = this.getQueryCriteria(
			request.query,
			walletCriteriaSchemaObject,
		) as Search.Criteria.WalletCriteria;
		const options = this.getListingOptions();

		const wallets = await this.walletRepositoryFactory().findManyByCritera(
			{
				...criteria,
				attributes: {
					vote: delegate.publicKey,
				},
			},
			sorting,
			pagination,
			options,
		);

		return this.toPagination(wallets, WalletResource, request.query.transform);
	}

	public async blocks(request: Hapi.Request) {
		const walletId = request.params.id as string;

		const delegate = await this.getWallet(walletId);
		if (!delegate || !delegate.publicKey) {
			return Boom.notFound("Delegate not found");
		}

		const criteria: Search.Criteria.BlockCriteria = {
			...request.query,
			generatorPublicKey: delegate.publicKey,
		};

		const pagination = this.getListingPage(request);
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions();

		const blocks = await this.blockRepositoryFactory().findManyByCriteria(criteria, sorting, pagination, options);
		const state = await this.getState();

		return this.toPagination(
			await this.enrichBlockResult(blocks, { generators: { [delegate.publicKey!]: delegate }, state }),
			BlockResource,
			request.query.transform,
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
