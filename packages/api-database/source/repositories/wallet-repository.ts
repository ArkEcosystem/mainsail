import type { RepositoryDataSource, WalletRepository, WalletRepositoryExtension } from "../contracts.js";
import type { Criteria, Options, Pagination, ResultsPage, SortFragment, Sorting } from "../search/types/index.js";

import { Wallet } from "../models/wallet.js";
import { WalletFilter } from "../search/filters/index.js";
import { ValidatorFilter } from "../search/filters/validator-filter.js";
import { makeExtendedRepository } from "./repository-extension.js";

const columns = new Set(["address", "balance", "nonce", "publicKey"]);

const validatorAttributes = new Map([
	["blocks.last.hash", "validatorLastBlock.hash"],
	["blocks.last.number", "validatorLastBlock.number"],
	["blocks.produced", "validatorProducedBlocks"],
	["forged.fees", "validatorForgedFees"],
	["forged.rewards", "validatorForgedRewards"],
	["forged.total", "validatorForgedTotal"],
	["isResigned", "validatorResigned"],
	["production.approval", "validatorApproval"],
	["rank", "validatorRank"],
	["votes", "validatorVoteBalance"],
]);

const convertToJsonbSorting = (sorting: Sorting, defaultSort: Sorting, validators: boolean = false): Sorting => {
	if (sorting.length === 0) {
		return defaultSort;
	}

	return sorting.map(({ direction, property }): SortFragment =>
		columns.has(property)
			? { direction, property }
			: {
					direction,
					jsonFieldAccessor: WalletFilter.getAttributeAccessor(
						validatorAttributes.get(property) ?? property.replace(/^attributes\./, ""),
						validators,
					),
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
				convertToJsonbSorting(
					sorting,
					[
						{
							direction: "asc",
							jsonFieldAccessor: WalletFilter.getAttributeAccessor("validatorRank", true),
							property: "attributes",
						},
					],
					true,
				),
				pagination,
				options,
			);
		},
	});
