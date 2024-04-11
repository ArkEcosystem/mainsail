import { RepositoryDataSource, WalletRepository, WalletRepositoryExtension } from "../contracts.js";
import { Wallet } from "../models/wallet.js";
import { DelegateFilter } from "../search/filters/delegate-filter.js";
import { WalletFilter } from "../search/filters/index.js";
import { Criteria, Options, Pagination, ResultsPage, SortFragment, Sorting } from "../search/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeWalletRepository = (dataSource: RepositoryDataSource): WalletRepository =>
	makeExtendedRepository<Wallet, WalletRepositoryExtension>(Wallet, dataSource, {
		async findManyByCritera(
			walletCriteria: Criteria.OrWalletCriteria,
			sorting: Sorting,
			pagination: Pagination,
			options?: Options,
		): Promise<ResultsPage<Wallet>> {
			const walletExpression = await WalletFilter.getExpression(walletCriteria);
			return this.listByExpression(walletExpression, convertToJsonbSorting(sorting), pagination, options);
		},

		async findManyDelegatesByCritera(
			delegateCriteria: Criteria.OrDelegateCriteria,
			sorting: Sorting,
			pagination: Pagination,
			options?: Options,
		): Promise<ResultsPage<Wallet>> {
			const walletExpression = await DelegateFilter.getExpression(delegateCriteria);
			return this.listByExpression(walletExpression, convertToJsonbSorting(sorting), pagination, options);
		},
	});

const convertToJsonbSorting = (sorting: Sorting): Sorting => {
	if (sorting.length === 0) {
		// default sort
		return [
			{
				direction: "desc",
				jsonFieldAccessor: { cast: "bigint", fieldName: "balance", operator: "->>" },
				property: "attributes",
			},
		];
	}

	return sorting.map(
		(item): SortFragment => ({
			direction: item.direction,
			jsonFieldAccessor: {
				cast: "bigint",
				fieldName: item.property.replace("attributes.", ""),
				operator: "->>",
			},
			property: "attributes",
		}),
	);
};
