import { Wallet } from "../../models";
import { EqualCriteria, OrWalletCriteria, TransactionCriteria, WalletCriteria } from "../criteria";
import { Expression } from "../expressions";
import { handleAndCriteria, handleNumericCriteria, handleOrCriteria, optimizeExpression } from "../search";

export class WalletFilter {
	public static async getExpression(...criteria: OrWalletCriteria[]): Promise<Expression<Wallet>> {
		const expressions = await Promise.all(
			criteria.map((c) => handleOrCriteria(c, (c) => this.handleWalletCriteria(c))),
		);

		return optimizeExpression({ expressions, op: "and" });
	}

	private static async handleWalletCriteria(criteria: WalletCriteria): Promise<Expression<Wallet>> {
		return handleAndCriteria(criteria, async (key) => {
			switch (key) {
				case "address":
					return handleOrCriteria(criteria.address, async (c) =>
						// @ts-ignore
						this.handleAddressCriteria(c),
					);
				case "publicKey":
					return handleOrCriteria(criteria.publicKey, async (c) =>
						// @ts-ignore
						this.handlePublicKeyCriteria(c),
					);
				case "balance":
					return handleOrCriteria(criteria.balance, async (c) =>
						// @ts-ignore
						handleNumericCriteria("nonce", c),
					);
				case "nonce":
					return handleOrCriteria(criteria.nonce, async (c) =>
						// @ts-ignore
						handleNumericCriteria("nonce", c),
					);
				case "attributes":
					return handleOrCriteria(criteria.attributes, async (c) =>
						// @ts-ignore
						this.handleAttributesCriteria(c),
					);
				default:
					return { op: "true" };
			}
		});
	}

	private static async handleAddressCriteria(criteria: EqualCriteria<string>): Promise<Expression<Wallet>> {
		return {
			op: "equal",
			property: "address",
			value: criteria,
		};
	}

	private static async handlePublicKeyCriteria(criteria: EqualCriteria<string>): Promise<Expression<Wallet>> {
		return {
			op: "equal",
			property: "publicKey",
			value: criteria,
		};
	}

	private static async handleAttributesCriteria(criteria: TransactionCriteria): Promise<Expression<Wallet>> {
		// TODO
		return { op: "false" };
	}
}
