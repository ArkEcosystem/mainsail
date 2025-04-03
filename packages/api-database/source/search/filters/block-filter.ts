import { Block } from "../../models/block.js";
import { handleAndCriteria, handleComparisonCriteria, handleOrCriteria, optimizeExpression } from "../search.js";
import { BlockCriteria, OrBlockCriteria } from "../types/criteria.js";
import { Expression } from "../types/expressions.js";

export class BlockFilter {
	public static async getExpression(...criteria: OrBlockCriteria[]): Promise<Expression<Block>> {
		const expressions = await Promise.all(
			criteria.map((c) => handleOrCriteria(c, (c) => this.handleBlockCriteria(c))),
		);

		return optimizeExpression({ expressions, op: "and" });
	}

	private static async handleBlockCriteria(criteria: BlockCriteria): Promise<Expression<Block>> {
		return handleAndCriteria(criteria, async (key) => {
			switch (key) {
				case "hash": {
					return handleOrCriteria(criteria.hash, async (c) => ({ op: "equal", property: "hash", value: c }));
				}
				case "version": {
					return handleOrCriteria(criteria.version, async (c) => ({
						op: "equal",
						property: "version",
						value: c,
					}));
				}
				case "timestamp": {
					return handleOrCriteria(criteria.timestamp, async (c) =>
						// @ts-ignore
						handleComparisonCriteria("timestamp", c),
					);
				}
				case "parentHash": {
					return handleOrCriteria(criteria.parentHash, async (c) => ({
						op: "equal",
						property: "parentHash",
						value: c,
					}));
				}
				case "number": {
					return handleOrCriteria(criteria.number, async (c) =>
						// @ts-ignore
						handleComparisonCriteria("number", c),
					);
				}

				case "round": {
					return handleOrCriteria(criteria.round, async (c) =>
						// @ts-ignore
						handleComparisonCriteria("round", c),
					);
				}

				case "transactionsCount": {
					return handleOrCriteria(criteria.transactionsCount, async (c) =>
						// @ts-ignore
						handleComparisonCriteria("transactionsCount", c),
					);
				}
				case "amount": {
					return handleOrCriteria(criteria.amount, async (c) =>
						// @ts-ignore
						handleComparisonCriteria("amount", c),
					);
				}
				case "fee": {
					return handleOrCriteria(criteria.fee, async (c) =>
						// @ts-ignore
						handleComparisonCriteria("fee", c),
					);
				}
				case "reward": {
					return handleOrCriteria(criteria.reward, async (c) =>
						// @ts-ignore
						handleComparisonCriteria("reward", c),
					);
				}
				case "payloadSize": {
					return handleOrCriteria(criteria.payloadSize, async (c) =>
						// @ts-ignore
						handleComparisonCriteria("payloadSize", c),
					);
				}
				case "transactionsRoot": {
					return handleOrCriteria(criteria.transactionsRoot, async (c) => ({
						op: "equal",
						property: "transactionsRoot",
						value: c,
					}));
				}
				case "proposer": {
					return handleOrCriteria(criteria.proposer, async (c) => ({
						op: "equal",
						property: "proposer",
						value: c,
					}));
				}
				default: {
					return { op: "true" };
				}
			}
		});
	}
}
