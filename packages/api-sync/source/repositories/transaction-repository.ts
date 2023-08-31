import { Contracts, Repositories } from "@mainsail/api-database";

export type ITransactionRepository = Contracts.ITransactionRepository & {};

export const makeTransactionRepository = (dataSource: Contracts.RepositoryDataSource): ITransactionRepository =>
	Repositories.makeTransactionRepository(dataSource).extend({
		// TODO: Add any custom extensions here...
	});
