import Hapi from "@hapi/hapi";
import Boom from "@hapi/boom";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { BlockResource, TransactionResource } from "../resources";
import { Controller } from "./controller";

@injectable()
export class BlocksController extends Controller {
	@inject(ApiDatabaseIdentifiers.BlockRepositoryFactory)
	private readonly blockRepositoryFactory!: ApiDatabaseContracts.IBlockRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.ITransactionRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.WalletRepositoryFactory)
	private readonly walletRepositoryFactory!: ApiDatabaseContracts.IWalletRepositoryFactory;

	public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const criteria: Search.Criteria.BlockCriteria = request.query;
		const pagination = this.getListingPage(request);
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions();

		const blocks = await this.blockRepositoryFactory()
			.findManyByCriteria(
				criteria,
				sorting,
				pagination,
				options,
			);

		return this.toPagination(blocks,
			BlockResource,
			request.query.transform,
		);
	}

	public async first(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const block = await this.blockRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("height = :height", { height: 1 })
			.getOne();

		return this.respondWithResource(block, BlockResource, request.query.transform);
	}

	public async last(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const block = await this.blockRepositoryFactory()
			.createQueryBuilder()
			.select()
			.orderBy("height", "DESC")
			.limit(1)
			.getOne();

		return this.respondWithResource(block, BlockResource, request.query.transform);
	}

	public async show(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const blockRepository = this.blockRepositoryFactory();
		const blockCriteria = this.getBlockCriteriaByIdOrHeight(request.params.id);

		const block = await blockRepository.findOneByCriteria(
			blockCriteria,
		);

		return this.respondWithResource(block, BlockResource, request.query.transform);
	}

	public async transactions(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const blockCriteria = this.getBlockCriteriaByIdOrHeight(request.params.id);
		const block = await this.blockRepositoryFactory().findOneByCriteria(
			blockCriteria,
		);

		if (!block) {
			return Boom.notFound("Block not found");
		}

		const pagination = this.getListingPage(request);
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions();

		const walletRepository = this.walletRepositoryFactory();
		const criteria: Search.Criteria.TransactionCriteria = { ...request.query, blockId: block.id };

		const transactions = await this.transactionRepositoryFactory().findManyByCritera(
			walletRepository,
			criteria,
			sorting,
			pagination,
			options,
		);

		return this.toPagination(transactions, TransactionResource, request.query.transform);
	}

	private getBlockCriteriaByIdOrHeight(idOrHeight: string): Search.Criteria.OrBlockCriteria {
		const asHeight = Number(idOrHeight);
		// NOTE: This assumes all block ids are sha256 and never a valid nubmer below this threshold.
		return asHeight && asHeight <= Number.MAX_SAFE_INTEGER ? { height: asHeight } : { id: idOrHeight };
	}
}
