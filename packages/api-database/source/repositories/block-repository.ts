import { IBlockRepository, IBlockRepositoryExtension, ITransactionRepository, RepositoryDataSource } from "../contracts";
import { Block } from "../models/block";
import { Criteria } from "../search";
import { BlockFilter } from "../search/filters";
import { makeExtendedRepository } from "./repository-extension";

export const makeBlockRepository = (dataSource: RepositoryDataSource): IBlockRepository =>
	makeExtendedRepository<Block, IBlockRepositoryExtension>(Block, dataSource, {
		async getLatest(): Promise<Block | null> {
			return this.createQueryBuilder().select().orderBy("height", "DESC").limit(1).getOne();
		},

		async getLatestHeight(): Promise<number | undefined> {
			const result = await this.createQueryBuilder().select("height").orderBy("height", "DESC").limit(1).getRawOne<{ height: string }>();
			if (!result) {
				return undefined;
			}

			return Number(result.height);
		},

		async findOneByCriteriaJoinTransactions(
			transactionRepository: ITransactionRepository,
			blockCriteria: Criteria.OrBlockCriteria,
			// transactionCriteria: Search.Criteria.OrTransactionCriteria,
		): Promise<Block | undefined> {
			const data = await this.findManyByCriteriaJoinTransactions(
				transactionRepository,
				blockCriteria,
			);

			return data[0];
		},

		async findManyByCriteriaJoinTransactions(
			// @ts-ignore
			transactionRepository: ITransactionRepository,
			blockCriteria: Criteria.OrBlockCriteria,
		): Promise<Block[]> {
			const blockExpression = await BlockFilter.getExpression(blockCriteria);
			const blockModels = await this.findManyByExpression(blockExpression);

			//	const transactionBlockCriteria = blockModels.map((b) => ({ blockId: b.id }));
			// const transactionExpression = await this.transactionFilter.getExpression(
			//     transactionCriteria,
			//     transactionBlockCriteria,
			// );

			// const transactionModels = await this.transactionRepository.findManyByExpression(transactionExpression);
			// const blockDataWithTransactionData = this.modelConverter.getBlockDataWithTransactionData(
			//     blockModels,
			//     transactionModels,
			// );

			return blockModels;
		}
	});
