import { RepositoryDataSource, WalletRepository, WalletRepositoryExtension } from "../contracts.js";
import { Wallet } from "../models/wallet.js";
import { WalletFilter } from "../search/filters/index.js";
import { ValidatorFilter } from "../search/filters/validator-filter.js";
import { Criteria, Options, Pagination, ResultsPage, SortFragment, Sorting } from "../search/types/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

const convertToJsonbSorting = (sorting: Sorting, defaultSort: Sorting): Sorting => {
	if (sorting.length === 0) {
		return defaultSort;
	}

	return sorting.map(
		(item): SortFragment => ({
			direction: item.direction,
			jsonFieldAccessor: {
				cast: "numeric",
				fieldName: item.property.replace("attributes.", ""),
				operator: "->>",
			},
			property: "attributes",
		}),
	);
};

export const makeWalletRepository = (dataSource: RepositoryDataSource): WalletRepository =>
	makeExtendedRepository<Wallet, WalletRepositoryExtension>(Wallet, dataSource, {
		async findManyByCriteria(
			walletCriteria: Criteria.OrWalletCriteria,
			sorting: Sorting,
			pagination: Pagination,
			options?: Options,
		): Promise<ResultsPage<Wallet>> {
			const walletExpression = await WalletFilter.getExpression(walletCriteria);
			return this.listByExpression(
				walletExpression,
				convertToJsonbSorting(sorting, [
					{
						direction: "desc",
						jsonFieldAccessor: { cast: "numeric", fieldName: "balance", operator: "->>" },
						property: "attributes",
					},
				]),
				pagination,
				options,
			);
		},

		async findManyValidatorsByCritera(
			validatorCriteria: Criteria.OrValidatorCriteria,
			sorting: Sorting,
			pagination: Pagination,
			options?: Options,
		): Promise<ResultsPage<Wallet>> {
			const walletExpression = await ValidatorFilter.getExpression(validatorCriteria);
			return this.listByExpression(
				walletExpression,
				convertToJsonbSorting(sorting, [
					{
						direction: "asc",
						jsonFieldAccessor: { cast: "bigint", fieldName: "validatorRank", operator: "->>" },
						property: "attributes",
					},
				]),
				pagination,
				options,
			);
		},
	});
