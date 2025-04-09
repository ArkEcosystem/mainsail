import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
	Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { BlockResource, ValidatorResource, WalletResource } from "../resources/index.js";
import { validatorCriteriaSchemaObject, walletCriteriaSchemaObject } from "../schemas/index.js";
import { Controller } from "./controller.js";

@injectable()
export class ValidatorsController extends Controller {
	@inject(ApiDatabaseIdentifiers.BlockRepositoryFactory)
	private readonly blockRepositoryFactory!: ApiDatabaseContracts.BlockRepositoryFactory;

	public async index(request: Hapi.Request) {
		const pagination = this.getQueryPagination(request.query);
		const sorting = this.getListingOrder(request);
		const criteria = this.getQueryCriteria(
			request.query,
			validatorCriteriaSchemaObject,
		) as Search.Criteria.ValidatorCriteria;
		const options = this.getListingOptions();

		const wallets = await this.walletRepositoryFactory().findManyValidatorsByCritera(
			criteria,
			sorting,
			pagination,
			options,
		);

		return this.toPagination(wallets, ValidatorResource);
	}

	public async show(request: Hapi.Request) {
		const walletId = request.params.id as string;

		const validator = await this.getWallet(walletId);
		if (!validator) {
			return Boom.notFound("Validator not found");
		}

		return this.respondWithResource(validator, ValidatorResource);
	}

	public async voters(request: Hapi.Request) {
		const walletId = request.params.id as string;

		const validator = await this.getWallet(walletId);
		if (!validator) {
			return Boom.notFound("Validator not found");
		}

		const pagination = this.getQueryPagination(request.query);
		const sorting = this.getListingOrder(request);
		const criteria = this.getQueryCriteria(
			request.query,
			walletCriteriaSchemaObject,
		) as Search.Criteria.WalletCriteria;
		const options = this.getListingOptions();

		const wallets = await this.walletRepositoryFactory().findManyByCriteria(
			{
				...criteria,
				attributes: {
					vote: validator.address,
				},
			},
			sorting,
			pagination,
			options,
		);

		return this.toPagination(wallets, WalletResource);
	}

	public async blocks(request: Hapi.Request) {
		const walletId = request.params.id as string;

		const validator = await this.getWallet(walletId);
		if (!validator || !validator.publicKey) {
			return Boom.notFound("Validator not found");
		}

		const criteria: Search.Criteria.BlockCriteria = {
			...request.query,
			proposer: validator.address,
		};

		const pagination = this.getListingPage(request);
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions();

		const blocks = await this.blockRepositoryFactory().findManyByCriteria(criteria, sorting, pagination, options);
		const state = await this.getState();

		return this.toPagination(
			await this.enrichBlockResult(blocks, { generators: { [validator.address]: validator }, state }),
			BlockResource,
		);
	}

	private async getWallet(walletId: string): Promise<Models.Wallet | null> {
		return this.walletRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("attributes ? :validatorPublicKey", { validatorPublicKey: "validatorPublicKey" })
			.andWhere(
				new ApiDatabaseContracts.Brackets((query) => {
					query
						.where("address = :address", { address: walletId })
						.orWhere("public_key = :publicKey", { publicKey: walletId })
						.orWhere("attributes @> :username", { username: { username: walletId } });
				}),
			)
			.getOne();
	}
}
