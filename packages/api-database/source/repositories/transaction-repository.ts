import { ITransactionRepository, ITransactionRepositoryExtension, IWalletRepository, RepositoryDataSource } from "../contracts";
import { Transaction } from "../models";
import { Criteria, Options, Pagination, ResultsPage, Sorting } from "../search";
import { TransactionFilter } from "../search/filters/transaction-filter";
import { makeExtendedRepository } from "./repository-extension";

export const makeTransactionRepository = (dataSource: RepositoryDataSource): ITransactionRepository =>
	makeExtendedRepository<Transaction, ITransactionRepositoryExtension>(Transaction, dataSource, {
		async findManyByCritera(
			walletRepository: IWalletRepository,
			transactionCriteria: Criteria.OrTransactionCriteria,
			sorting: Sorting,
			pagination: Pagination,
			options?: Options,
		): Promise<ResultsPage<Transaction>> {
			const transactionExpression = await TransactionFilter.getExpression(walletRepository, transactionCriteria);
			return this.listByExpression(transactionExpression, sorting, pagination, options);
		},
	});
