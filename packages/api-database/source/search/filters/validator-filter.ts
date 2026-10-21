import type { Wallet } from "../../models/index.js";
import type {
	OrNumericCriteria,
	OrValidatorCriteria,
	ValidatorBlocks,
	ValidatorCriteria,
	ValidatorForged,
	ValidatorProduction,
	ValidatorResourceLastBlock,
} from "../types/criteria.js";
import type { Expression } from "../types/expressions.js";

import { handleAndCriteria, handleComparisonCriteria, handleOrCriteria, optimizeExpression } from "../search.js";
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
					return this.handleAttributeCriteria(criteria.votes, "validatorVoteBalance");
				}
				case "rank": {
					return this.handleAttributeCriteria(criteria.rank, "validatorRank");
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

	private static async handleAttributeCriteria(
		criteria: OrNumericCriteria<string | number> | undefined,
		fieldName: string,
	): Promise<Expression<Wallet>> {
		return handleOrCriteria(criteria, async (c) =>
			// @ts-ignore
			handleComparisonCriteria("attributes", c, WalletFilter.getAttributeAccessor(fieldName)),
		);
	}

	private static async handleForgedCriteria(criteria?: ValidatorForged): Promise<Expression<Wallet>> {
		if (!criteria) {
			return { op: "false" };
		}

		const expressions: Promise<Expression<Wallet>>[] = [];

		for (const item of criteria as ValidatorForged[]) {
			if (item.fees) {
				expressions.push(this.handleAttributeCriteria(item.fees, "validatorForgedFees"));
			}

			if (item.rewards) {
				expressions.push(this.handleAttributeCriteria(item.rewards, "validatorForgedRewards"));
			}

			if (item.total) {
				expressions.push(this.handleAttributeCriteria(item.total, "validatorForgedTotal"));
			}
		}

		return { expressions: await Promise.all(expressions), op: "or" };
	}

	private static async handleBlocksCriteria(criteria?: ValidatorBlocks): Promise<Expression<Wallet>> {
		if (!criteria) {
			return { op: "false" };
		}

		const expressions: Promise<Expression<Wallet>>[] = [];

		for (const item of criteria as ValidatorBlocks[]) {
			if (item.produced) {
				expressions.push(this.handleAttributeCriteria(item.produced, "validatorProducedBlocks"));
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

		for (const item of criteria as ValidatorResourceLastBlock[]) {
			if (item.hash) {
				expressions.push(this.handleAttributeCriteria(item.hash, "validatorLastBlock.hash"));
			}

			if (item.number) {
				expressions.push(this.handleAttributeCriteria(item.number, "validatorLastBlock.number"));
			}
		}

		return { expressions: await Promise.all(expressions), op: "or" };
	}

	private static async handleProductionCriteria(criteria?: ValidatorProduction): Promise<Expression<Wallet>> {
		if (!criteria) {
			return { op: "false" };
		}

		const expressions: Promise<Expression<Wallet>>[] = [];

		for (const item of criteria as ValidatorProduction[]) {
			if (item.approval) {
				expressions.push(this.handleAttributeCriteria(item.approval, "validatorApproval"));
			}
		}

		return { expressions: await Promise.all(expressions), op: "or" };
	}
}
