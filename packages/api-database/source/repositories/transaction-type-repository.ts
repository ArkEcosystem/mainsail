import { ITransactionTypeRepository, ITransactionTypeRepositoryExtension, RepositoryDataSource } from "../contracts";
import { TransactionType } from "../models/transaction-type";
import { makeExtendedRepository } from "./repository-extension";

export const makeTransactionTypeRepository = (dataSource: RepositoryDataSource): ITransactionTypeRepository =>
	makeExtendedRepository<TransactionType, ITransactionTypeRepositoryExtension>(TransactionType, dataSource, {
	});
