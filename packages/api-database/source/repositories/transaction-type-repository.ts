import { RepositoryDataSource, TransactionTypeRepository, TransactionTypeRepositoryExtension } from "../contracts";
import { TransactionType } from "../models/transaction-type";
import { makeExtendedRepository } from "./repository-extension";

export const makeTransactionTypeRepository = (dataSource: RepositoryDataSource): TransactionTypeRepository =>
	makeExtendedRepository<TransactionType, TransactionTypeRepositoryExtension>(TransactionType, dataSource, {});
