import { IWalletRepository, IWalletRepositoryExtension, RepositoryDataSource } from "../contracts";
import { Wallet } from "../models/wallet";
import { Criteria, Options, Pagination, ResultsPage, Sorting } from "../search";
import { WalletFilter } from "../search/filters";
import { makeExtendedRepository } from "./repository-extension";

export const makeWalletRepository = (dataSource: RepositoryDataSource): IWalletRepository =>
	makeExtendedRepository<Wallet, IWalletRepositoryExtension>(Wallet, dataSource, {
		async findManyByCritera(
			transactionCriteria: Criteria.OrWalletCriteria,
			sorting: Sorting,
			pagination: Pagination,
			options?: Options,
		): Promise<ResultsPage<Wallet>> {
			const walletExpression = await WalletFilter.getExpression(transactionCriteria);
			return this.listByExpression(walletExpression, sorting, pagination, options);
		},
	});
