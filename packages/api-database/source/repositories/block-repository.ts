import { Block } from "../models/block";
import { IBlockRepository, RepositoryDataSource } from "../contracts";

export const makeBlockRepository = (dataSource: RepositoryDataSource): IBlockRepository => {
    return dataSource.getRepository(Block).extend({
        async getLatest(): Promise<Block | null> {
            return this.createQueryBuilder().
                select().
                orderBy("height", "DESC").
                limit(1).
                getOne();
        }
    });
}
