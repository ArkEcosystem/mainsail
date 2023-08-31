import { ITransactionRepository, RepositoryDataSource } from "../contracts";
import { Transaction } from "../models";

export const makeTransactionRepository = (dataSource: RepositoryDataSource): ITransactionRepository =>
	dataSource.getRepository(Transaction).extend({
		// Add any default extensions here
	});
