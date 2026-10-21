import type { RepositoryDataSource, WalletRepository, WalletRepositoryExtension } from "../contracts.js";
import type { Criteria, Options, Pagination, ResultsPage, SortFragment, Sorting } from "../search/types/index.js";

import { Wallet } from "../models/wallet.js";
import { WalletFilter } from "../search/filters/index.js";
import { ValidatorFilter } from "../search/filters/validator-filter.js";
import { breakTies, makeExtendedRepository } from "./repository-extension.js";

const columns = new Set(["address", "balance", "nonce", "publicKey"]);

// Validator sorting names and the attributes they are stored as, see ValidatorFilter.
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
	["username", "username"],
	["votes", "validatorVoteBalance"],
]);

const convertToJsonbSorting = (sorting: Sorting, defaultSort: Sorting, validators: boolean = false): Sorting => {
	if (sorting.length === 0) {
		return defaultSort;
	}

	return sorting.map(({ direction, property }): SortFragment => {
		if (columns.has(property)) {
			return { direction, property };
		}

		const fieldName = validatorAttributes.get(property) ?? property.replace(/^attributes\./, "");

		return {
			direction,
			jsonFieldAccessor: WalletFilter.getAttributeAccessor(fieldName, validators),
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
				breakTies(convertToJsonbSorting(sorting, [{ direction: "desc", property: "balance" }]), "address"),
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
				breakTies(
					convertToJsonbSorting(
						sorting,
						[
							{
								direction: "asc",
								jsonFieldAccessor: { cast: "bigint", fieldName: "validatorRank", operator: "->>" },
								property: "attributes",
							},
						],
						true,
					),
					"address",
				),
				pagination,
				options,
			);
		},
	});
