import { IBlockRepository, RepositoryDataSource } from "../contracts";
import { Block } from "../models/block";

export const makeBlockRepository = (dataSource: RepositoryDataSource): IBlockRepository =>
	dataSource.getRepository(Block).extend({
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
	});
