import { BlockRepository, BlockRepositoryExtension, RepositoryDataSource } from "../contracts.js";
import { Block } from "../models/block.js";
import { BlockFilter } from "../search/filters/index.js";
import { Criteria, Options, Pagination, ResultsPage, Sorting } from "../search/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeBlockRepository = (dataSource: RepositoryDataSource): BlockRepository =>
	makeExtendedRepository<Block, BlockRepositoryExtension>(Block, dataSource, {
		async findManyByCriteria(
			blockCriteria: Criteria.OrBlockCriteria,
			sorting: Sorting,
			pagination: Pagination,
			options?: Options,
		): Promise<ResultsPage<Block>> {
			const blockExpression = await BlockFilter.getExpression(blockCriteria);
			return this.listByExpression(blockExpression, sorting, pagination, options);
		},

		async findOneByCriteria(blockCriteria: Criteria.OrBlockCriteria): Promise<Block | null> {
			const block = await this.createQueryBuilder().where(blockCriteria).limit(1).getOne();

			if (!block) {
				return null;
			}

			return block;
		},

		async getLatest(): Promise<Block | null> {
			return this.createQueryBuilder().select().orderBy("height", "DESC").limit(1).getOne();
		},

		async getLatestHeight(): Promise<number | undefined> {
			const result = await this.createQueryBuilder()
				.select("height")
				.orderBy("height", "DESC")
				.limit(1)
				.getRawOne<{ height: string }>();
			if (!result) {
				return undefined;
			}

			return Number(result.height);
		},
	});
