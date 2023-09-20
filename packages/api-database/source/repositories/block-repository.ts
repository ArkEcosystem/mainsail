import { IBlockRepository, IBlockRepositoryExtension, RepositoryDataSource } from "../contracts";
import { Block } from "../models/block";
import { makeExtendedRepository } from "./repository-extension";
// import { BlockFilter } from "../search/filters/block-filter";

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

		//getFilter(): BlockFilter { return new BlockFilter() },
	});
