import { Wallet } from "../../models";
import { DelegateCriteria, OrDelegateCriteria } from "../criteria";
import { Expression } from "../expressions";
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
				case "address":
					return handleOrCriteria(criteria.address, async (c) => ({
						op: "equal",
						property: "address",
						value: criteria,
					}));

				case "publicKey":
					return handleOrCriteria(criteria.publicKey, async (c) => ({
						op: "equal",
						property: "publicKey",
						value: criteria,
					}));

				case "votes":
					return handleOrCriteria(criteria.votes, async (c) =>
						// @ts-ignore
						handleNumericCriteria("attributes", c, { fieldName: "validatorVoteBalance", operator: "->>" }),
					);
				case "rank":
					return handleOrCriteria(criteria.rank, async (c) =>
						// @ts-ignore
						handleNumericCriteria("attributes", c, { fieldName: "validatorRank", operator: "->>" }),
					);

				case "isResigned":
					return handleOrCriteria(criteria.isResigned, async (c) => ({
						jsonFieldAccessor: { fieldName: "validatorResigned", operator: "->>" },
						op: "equal",
						property: "attributes",
						value: c,
					}));

				default:
					return { op: "true" };
			}
		});
	}
}
