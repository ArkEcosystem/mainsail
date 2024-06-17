import { Receipt } from "../../models/index.js";
import { ReceiptCriteria, OrReceiptCriteria } from "../criteria.js";
import { Expression } from "../expressions.js";
import { handleAndCriteria, handleOrCriteria, optimizeExpression } from "../search.js";

export class ReceiptFilter {
	public static async getExpression(...criteria: OrReceiptCriteria[]): Promise<Expression<Receipt>> {
		const expressions = await Promise.all(
			criteria.map((c) => handleOrCriteria(c, (c) => this.handleReceiptCriteria(c))),
		);

		return optimizeExpression({ expressions, op: "and" });
	}

	private static async handleReceiptCriteria(criteria: ReceiptCriteria): Promise<Expression<Receipt>> {
		return handleAndCriteria(criteria, async (key) => {
			switch (key) {
				case "txHash": {
					return handleOrCriteria(criteria.txHash, async (c) => ({
						op: "equal",
						property: "id",
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
