import { Wallet } from "../../models";
import {
	DelegateBlocks,
	DelegateCriteria,
	DelegateForged,
	DelegateProduction,
	DelegateResourceLastBlock,
	OrDelegateCriteria,
	OrNumericCriteria,
} from "../criteria";
import { Expression, JsonFieldCastType } from "../expressions";
import { handleAndCriteria, handleNumericCriteria, handleOrCriteria, optimizeExpression } from "../search";

export class DelegateFilter {
	public static async getExpression(...criteria: OrDelegateCriteria[]): Promise<Expression<Wallet>> {
		const expressions = await Promise.all(
			criteria.map((c) => handleOrCriteria(c, (c) => this.handleDelegateCriteria(c))),
		);

		return optimizeExpression({ expressions, op: "and" });
	}

	private static async handleDelegateCriteria(criteria: DelegateCriteria): Promise<Expression<Wallet>> {
		return handleAndCriteria(criteria, async (key) => {
			switch (key) {
				case "address": {
					return handleOrCriteria(criteria.address, async (c) => ({
						op: "equal",
						property: "address",
						value: criteria,
					}));
				}

				case "publicKey": {
					return handleOrCriteria(criteria.publicKey, async (c) => ({
						op: "equal",
						property: "publicKey",
						value: criteria,
					}));
				}

				case "votes": {
					return handleOrCriteria(criteria.votes, async (c) =>
						// @ts-ignore
						handleNumericCriteria("attributes", c, { fieldName: "validatorVoteBalance", operator: "->>" }),
					);
				}
				case "rank": {
					return handleOrCriteria(criteria.rank, async (c) =>
						// @ts-ignore
						handleNumericCriteria("attributes", c, { fieldName: "validatorRank", operator: "->>" }),
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

				default: {
					return { op: "true" };
				}
			}
		});
	}

	private static async handleForgedCriteria(criteria?: DelegateForged): Promise<Expression<Wallet>> {
		if (!criteria) {
			return { op: "false" };
		}

		const expressions: Promise<Expression<Wallet>>[] = [];
		const addExpression = (criteria: OrNumericCriteria<string>, fieldName: string) =>
			expressions.push(
				handleOrCriteria(criteria, async (c) =>
					// @ts-ignore
					handleNumericCriteria("attributes", c, { fieldName, operator: "->>" }),
				),
			);

		for (const item of criteria as DelegateForged[]) {
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

	private static async handleBlocksCriteria(criteria?: DelegateBlocks): Promise<Expression<Wallet>> {
		if (!criteria) {
			return { op: "false" };
		}

		const expressions: Promise<Expression<Wallet>>[] = [];
		const addExpression = (criteria: OrNumericCriteria<string | number>, fieldName: string) =>
			expressions.push(
				handleOrCriteria(criteria, async (c) =>
					// @ts-ignore
					handleNumericCriteria("attributes", c, { fieldName, operator: "->>" }),
				),
			);

		for (const item of criteria as DelegateBlocks[]) {
			if (item.produced) {
				addExpression(item.produced, "validatorProducedBlocks");
			}

			if (item.last) {
				expressions.push(this.handleLastBlockCriteria(item.last));
			}
		}

		return { expressions: await Promise.all(expressions), op: "or" };
	}

	private static async handleLastBlockCriteria(criteria?: DelegateResourceLastBlock): Promise<Expression<Wallet>> {
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
					handleNumericCriteria("attributes", c, { cast, fieldName, operator: "->>" }),
				),
			);

		for (const item of criteria as DelegateResourceLastBlock[]) {
			if (item.id) {
				addExpression(item.id, "validatorLastBlock.id");
			}

			if (item.height) {
				addExpression(item.height, "validatorLastBlock.height", "bigint");
			}
		}

		return { expressions: await Promise.all(expressions), op: "or" };
	}

	private static async handleProductionCriteria(criteria?: DelegateProduction): Promise<Expression<Wallet>> {
		if (!criteria) {
			return { op: "false" };
		}

		const expressions: Promise<Expression<Wallet>>[] = [];
		const addExpression = (criteria: OrNumericCriteria<string | number>, fieldName: string) =>
			expressions.push(
				handleOrCriteria(criteria, async (c) =>
					// @ts-ignore
					handleNumericCriteria("attributes", c, { fieldName, operator: "->>" }),
				),
			);

		for (const item of criteria as DelegateProduction[]) {
			if (item.approval) {
				addExpression(item.approval, "validatorApproval");
			}
		}

		return { expressions: await Promise.all(expressions), op: "or" };
	}
}
