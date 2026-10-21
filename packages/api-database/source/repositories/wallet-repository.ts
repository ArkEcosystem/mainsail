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

	return sorting.map(({ direction, property }): SortFragment => {
		if (columns.has(property)) {
			return { direction, property };
		}

		return {
			direction,
			jsonFieldAccessor: {
				cast: "numeric",
				fieldName: property.replace("attributes.", ""),
				operator: "->>",
			},
			property: "attributes",
		};
	});
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
						jsonFieldAccessor: { cast: "bigint", fieldName: "validatorRank", operator: "->>" },
						property: "attributes",
					},
				]),
				pagination,
				options,
			);
		},
	});
