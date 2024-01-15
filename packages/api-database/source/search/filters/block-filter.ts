import { Block } from "../../models/block";
import { Criteria, Expressions } from "..";
import { handleAndCriteria, handleNumericCriteria, handleOrCriteria, optimizeExpression } from "../search";

export class BlockFilter {
	public static async getExpression(...criteria: Criteria.OrBlockCriteria[]): Promise<Expressions.Expression<Block>> {
		const expressions = await Promise.all(
			criteria.map((c) => handleOrCriteria(c, (c) => this.handleBlockCriteria(c))),
		);

		return optimizeExpression({ expressions, op: "and" });
	}

	private static async handleBlockCriteria(criteria: Criteria.BlockCriteria): Promise<Expressions.Expression<Block>> {
		return handleAndCriteria(criteria, async (key) => {
			switch (key) {
				case "id": {
					return handleOrCriteria(criteria.id, async (c) => ({ op: "equal", property: "id", value: c }));
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
						handleNumericCriteria("timestamp", c),
					);
				}
				case "previousBlock": {
					return handleOrCriteria(criteria.previousBlock, async (c) => ({
						op: "equal",
						property: "previousBlock",
						value: c,
					}));
				}
				case "height": {
					return handleOrCriteria(criteria.height, async (c) =>
						// @ts-ignore
						handleNumericCriteria("height", c),
					);
				}

				case "round": {
					return handleOrCriteria(criteria.round, async (c) =>
						// @ts-ignore
						handleNumericCriteria("round", c),
					);
				}

				case "numberOfTransactions": {
					return handleOrCriteria(criteria.numberOfTransactions, async (c) =>
						// @ts-ignore
						handleNumericCriteria("numberOfTransactions", c),
					);
				}
				case "totalAmount": {
					return handleOrCriteria(criteria.totalAmount, async (c) =>
						// @ts-ignore
						handleNumericCriteria("totalAmount", c),
					);
				}
				case "totalFee": {
					return handleOrCriteria(criteria.totalFee, async (c) =>
						// @ts-ignore
						handleNumericCriteria("totalFee", c),
					);
				}
				case "reward": {
					return handleOrCriteria(criteria.reward, async (c) =>
						// @ts-ignore
						handleNumericCriteria("reward", c),
					);
				}
				case "payloadLength": {
					return handleOrCriteria(criteria.payloadLength, async (c) =>
						// @ts-ignore
						handleNumericCriteria("payloadLength", c),
					);
				}
				case "payloadHash": {
					return handleOrCriteria(criteria.payloadHash, async (c) => ({
						op: "equal",
						property: "payloadHash",
						value: c,
					}));
				}
				case "generatorPublicKey": {
					return handleOrCriteria(criteria.generatorPublicKey, async (c) => ({
						op: "equal",
						property: "generatorPublicKey",
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
