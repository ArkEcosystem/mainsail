import type { RepositoryDataSource, WalletRepository, WalletRepositoryExtension } from "../contracts.js";
import type { Criteria, Options, Pagination, ResultsPage, SortFragment, Sorting } from "../search/types/index.js";

import { Wallet } from "../models/wallet.js";
import { WalletFilter } from "../search/filters/index.js";
import { ValidatorFilter } from "../search/filters/validator-filter.js";
import { makeExtendedRepository } from "./repository-extension.js";

const columns = new Set(["address", "balance", "nonce", "publicKey"]);

const convertToJsonbSorting = (sorting: Sorting, defaultSort: Sorting): Sorting => {
	if (sorting.length === 0) {
		return defaultSort;
	}

	return sorting.map(({ direction, property }): SortFragment =>
		columns.has(property)
			? { direction, property }
			: {
					direction,
					jsonFieldAccessor: WalletFilter.getAttributeAccessor(property.replace(/^attributes\./, "")),
					property: "attributes",
				},
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
				convertToJsonbSorting(sorting, [{ direction: "desc", property: "balance" }]),
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
						jsonFieldAccessor: WalletFilter.getAttributeAccessor("validatorRank"),
						property: "attributes",
					},
				]),
				pagination,
				options,
			);
		},
	});
