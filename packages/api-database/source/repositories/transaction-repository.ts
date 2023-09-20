import { ITransactionRepository, ITransactionRepositoryExtension, RepositoryDataSource } from "../contracts";
import { Transaction } from "../models";
import { makeExtendedRepository } from "./repository-extension";

export const makeTransactionRepository = (dataSource: RepositoryDataSource): ITransactionRepository =>
	makeExtendedRepository<Transaction, ITransactionRepositoryExtension>(Transaction, dataSource, {
		// Add any extensions here
	});
