import { RepositoryDataSource, TransactionTypeRepository, TransactionTypeRepositoryExtension } from "../contracts.js";
import { TransactionType } from "../models/transaction-type.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeTransactionTypeRepository = (dataSource: RepositoryDataSource): TransactionTypeRepository =>
	makeExtendedRepository<TransactionType, TransactionTypeRepositoryExtension>(TransactionType, dataSource, {});
