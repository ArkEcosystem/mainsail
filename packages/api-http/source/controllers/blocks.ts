import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
	Search,
} from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Utils } from "@mainsail/kernel";

import { BlockResource, TransactionResource } from "../resources";
import { Controller } from "./controller";

@injectable()
export class BlocksController extends Controller {
	@inject(ApiDatabaseIdentifiers.BlockRepositoryFactory)
	private readonly blockRepositoryFactory!: ApiDatabaseContracts.IBlockRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.ITransactionRepositoryFactory;

	public async index(request: Hapi.Request) {
		const criteria: Search.Criteria.BlockCriteria = request.query;
		const pagination = this.getListingPage(request);
		const sorting = this.getListingOrder(request);
		const options = this.getListingOptions();

		const blocks = await this.blockRepositoryFactory().findManyByCriteria(criteria, sorting, pagination, options);
		if (blocks.results.length === 0) {
			return this.toPagination(blocks, BlockResource, request.query.transform);
		}

		const generatorPublicKeys = blocks.results.map(({ generatorPublicKey }) => generatorPublicKey);
		const generators = await this.walletRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("public_key IN (:...publicKeys)", { publicKeys: generatorPublicKeys })
			.getMany();

		return this.toPagination(
			await this.enrichBlockResult(blocks, {
				generators: generators.reduce((accumulator, current) => {
					Utils.assert.defined<string>(current.publicKey);
					accumulator[current.publicKey] = current;
					return accumulator;
				}, {}),
			}),
			BlockResource,
			request.query.transform,
		);
	}

	public async first(request: Hapi.Request) {
		const block = await this.blockRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("height = :height", { height: 0 })
			.getOne();

		return this.respondEnrichedBlock(block, request);
	}

	public async last(request: Hapi.Request) {
		const block = await this.blockRepositoryFactory()
			.createQueryBuilder()
			.select()
			.orderBy("height", "DESC")
			.limit(1)
			.getOne();

		return this.respondEnrichedBlock(block, request);
	}

	public async show(request: Hapi.Request) {
		const blockRepository = this.blockRepositoryFactory();
		const blockCriteria = this.getBlockCriteriaByIdOrHeight(request.params.id);

		const block = await blockRepository.findOneByCriteria(blockCriteria);

		return this.respondEnrichedBlock(block, request);
	}

	public async transactions(request: Hapi.Request) {
		const blockCriteria = this.getBlockCriteriaByIdOrHeight(request.params.id);
		const block = await this.blockRepositoryFactory().findOneByCriteria(blockCriteria);

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

	private async respondEnrichedBlock(block: Models.Block | null, request: Hapi.Request) {
		return this.respondWithResource(await this.enrichBlock(block), BlockResource, request.query.transform);
	}
}
