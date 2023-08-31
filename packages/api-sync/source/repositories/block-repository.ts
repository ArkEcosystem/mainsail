import { Contracts, Repositories } from "@mainsail/api-database";

export type IBlockRepository = Contracts.IBlockRepository & {};

export const makeBlockRepository = (dataSource: Contracts.RepositoryDataSource): IBlockRepository =>
	Repositories.makeBlockRepository(dataSource).extend({
		// TODO: Add any custom extensions here...
	});
