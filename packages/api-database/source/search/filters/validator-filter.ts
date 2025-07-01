import { Wallet } from "../../models/index.js";
import { handleAndCriteria, handleComparisonCriteria, handleOrCriteria, optimizeExpression } from "../search.js";
import {
	OrNumericCriteria,
	OrValidatorCriteria,
	ValidatorBlocks,
	ValidatorCriteria,
	ValidatorForged,
	ValidatorProduction,
	ValidatorResourceLastBlock,
} from "../types/criteria.js";
import { Expression, JsonFieldCastType } from "../types/expressions.js";
import { WalletFilter } from "./wallet-filter.js";

export class ValidatorFilter {
	public static async getExpression(...criteria: OrValidatorCriteria[]): Promise<Expression<Wallet>> {
		const expressions = await Promise.all(
			criteria.map((c) => handleOrCriteria(c, (c) => this.handleValidatorCriteria(c))),
		);

		return optimizeExpression({
			expressions: [
				{
					expressions: [
						{ attribute: "validatorPublicKey", op: "jsonbAttributeExists", property: "attributes" },
						{
							jsonFieldAccessor: { fieldName: "validatorPublicKey", operator: "->>" },
							op: "notEqual",
							property: "attributes",
							value: "",
						},
					],
					op: "and",
				},
				...expressions,
			],
			op: "and",
		});
	}

	private static async handleValidatorCriteria(criteria: ValidatorCriteria): Promise<Expression<Wallet>> {
		return handleAndCriteria(criteria, async (key) => {
			switch (key) {
				case "address": {
					return handleOrCriteria(criteria.address, async (c) => ({
						op: "equal",
						property: "address",
						value: c,
					}));
				}

				case "publicKey": {
					return handleOrCriteria(criteria.publicKey, async (c) => ({
						op: "equal",
						property: "publicKey",
						value: c,
					}));
				}

				case "votes": {
					return handleOrCriteria(criteria.votes, async (c) =>
						// @ts-ignore
						handleComparisonCriteria("attributes", c, {
							fieldName: "validatorVoteBalance",
							operator: "->>",
						}),
					);
				}
				case "rank": {
					return handleOrCriteria(criteria.rank, async (c) =>
						// @ts-ignore
						handleComparisonCriteria("attributes", c, { fieldName: "validatorRank", operator: "->>" }),
					);
				}

				case "isResigned": {
					return handleOrCriteria(criteria.isResigned, async (c) => ({
						jsonFieldAccessor: { fieldName: "validatorResigned", operator: "->>" },
						op: "equal",
						property: "attributes",
						value: c,
					}));
				}

				case "forged": {
					return this.handleForgedCriteria(criteria.forged);
				}

				case "production": {
					return this.handleProductionCriteria(criteria.production);
				}

				case "blocks": {
					return this.handleBlocksCriteria(criteria.blocks);
				}
				case "attributes": {
					return handleOrCriteria(criteria.attributes, async (c) =>
						// @ts-ignore
						WalletFilter.handleAttributesCriteria(c),
					);
				}
				default: {
					return { op: "true" };
				}
			}
		});
	}

	private static async handleForgedCriteria(criteria?: ValidatorForged): Promise<Expression<Wallet>> {
		if (!criteria) {
			return { op: "false" };
		}

		const expressions: Promise<Expression<Wallet>>[] = [];
		const addExpression = (criteria: OrNumericCriteria<string>, fieldName: string) =>
			expressions.push(
				handleOrCriteria(criteria, async (c) =>
					// @ts-ignore
					handleComparisonCriteria("attributes", c, { fieldName, operator: "->>" }),
				),
			);

		for (const item of criteria as ValidatorForged[]) {
			if (item.fees) {
				addExpression(item.fees, "validatorForgedFees");
			}

			if (item.rewards) {
				addExpression(item.rewards, "validatorForgedRewards");
			}

			if (item.total) {
				addExpression(item.total, "validatorForgedTotal");
			}
		}

		return { expressions: await Promise.all(expressions), op: "or" };
	}

	private static async handleBlocksCriteria(criteria?: ValidatorBlocks): Promise<Expression<Wallet>> {
		if (!criteria) {
			return { op: "false" };
		}

		const expressions: Promise<Expression<Wallet>>[] = [];
		const addExpression = (criteria: OrNumericCriteria<string | number>, fieldName: string) =>
			expressions.push(
				handleOrCriteria(criteria, async (c) =>
					// @ts-ignore
					handleComparisonCriteria("attributes", c, { fieldName, operator: "->>" }),
				),
			);

		for (const item of criteria as ValidatorBlocks[]) {
			if (item.produced) {
				addExpression(item.produced, "validatorProducedBlocks");
			}

			if (item.last) {
				expressions.push(this.handleLastBlockCriteria(item.last));
			}
		}

		return { expressions: await Promise.all(expressions), op: "or" };
	}

	private static async handleLastBlockCriteria(criteria?: ValidatorResourceLastBlock): Promise<Expression<Wallet>> {
		if (!criteria) {
			return { op: "false" };
		}

		const expressions: Promise<Expression<Wallet>>[] = [];
		const addExpression = (
			criteria: OrNumericCriteria<string | number>,
			fieldName: string,
			cast?: JsonFieldCastType,
		) =>
			expressions.push(
				handleOrCriteria(criteria, async (c) =>
					// @ts-ignore
					handleComparisonCriteria("attributes", c, { cast, fieldName, operator: "->>" }),
				),
			);

		for (const item of criteria as ValidatorResourceLastBlock[]) {
			if (item.hash) {
				addExpression(item.hash, "validatorLastBlock.hash");
			}

			if (item.number) {
				addExpression(item.number, "validatorLastBlock.number", "bigint");
			}
		}

		return { expressions: await Promise.all(expressions), op: "or" };
	}

	private static async handleProductionCriteria(criteria?: ValidatorProduction): Promise<Expression<Wallet>> {
		if (!criteria) {
			return { op: "false" };
		}

		const expressions: Promise<Expression<Wallet>>[] = [];
		const addExpression = (criteria: OrNumericCriteria<string | number>, fieldName: string) =>
			expressions.push(
				handleOrCriteria(criteria, async (c) =>
					// @ts-ignore
					handleComparisonCriteria("attributes", c, { fieldName, operator: "->>" }),
				),
			);

		for (const item of criteria as ValidatorProduction[]) {
			if (item.approval) {
				addExpression(item.approval, "validatorApproval");
			}
		}

		return { expressions: await Promise.all(expressions), op: "or" };
	}
}
