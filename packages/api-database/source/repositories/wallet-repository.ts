import { IWalletRepository, IWalletRepositoryExtension, RepositoryDataSource } from "../contracts";
import { Wallet } from "../models/wallet";
import { Criteria, Options, Pagination, ResultsPage, Sorting } from "../search";
import { WalletFilter } from "../search/filters";
import { DelegateFilter } from "../search/filters/delegate-filter";
import { makeExtendedRepository } from "./repository-extension";

export const makeWalletRepository = (dataSource: RepositoryDataSource): IWalletRepository =>
	makeExtendedRepository<Wallet, IWalletRepositoryExtension>(Wallet, dataSource, {
		async findManyByCritera(
			walletCriteria: Criteria.OrWalletCriteria,
			sorting: Sorting,
			pagination: Pagination,
			options?: Options,
		): Promise<ResultsPage<Wallet>> {
			const walletExpression = await WalletFilter.getExpression(walletCriteria);
			return this.listByExpression(walletExpression, sorting, pagination, options);
		},


		async findManyDelegatesByCritera(
			delegateCriteria: Criteria.OrDelegateCriteria,
			sorting: Sorting,
			pagination: Pagination,
			options?: Options,
		): Promise<ResultsPage<Wallet>> {
			const walletExpression = await DelegateFilter.getExpression(delegateCriteria);
			return this.listByExpression(walletExpression, sorting, pagination, options);
		},
	});
