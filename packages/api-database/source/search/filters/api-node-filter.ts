import { ApiNode } from "../../models";
import { Criteria, Expressions } from "..";
import { handleAndCriteria, handleNumericCriteria, handleOrCriteria, optimizeExpression } from "../search";

export class ApiNodeFilter {
	public static async getExpression(
		...criteria: Criteria.OrApiNodeCriteria[]
	): Promise<Expressions.Expression<ApiNode>> {
		const expressions = await Promise.all(
			criteria.map((c) => handleOrCriteria(c, (c) => this.handleApiNodeCriteria(c))),
		);

		return optimizeExpression({ expressions, op: "and" });
	}

	private static async handleApiNodeCriteria(
		criteria: Criteria.ApiNodeCriteria,
	): Promise<Expressions.Expression<ApiNode>> {
		return handleAndCriteria(criteria, async (key) => {
			switch (key) {
				case "ip":
					return handleOrCriteria(criteria.ip, async (c) => ({ op: "equal", property: "ip", value: c }));
				case "version":
					return handleOrCriteria(criteria.version, async (c) =>
						// @ts-ignore
						handleNumericCriteria("version", c),
					);
				default:
					return { op: "true" };
			}
		});
	}
}
