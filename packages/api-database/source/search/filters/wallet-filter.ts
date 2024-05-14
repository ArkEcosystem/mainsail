import { isObject } from "@mainsail/utils";

import { Wallet } from "../../models/index.js";
import { EqualCriteria, OrWalletCriteria, WalletCriteria } from "../criteria.js";
import { Expression, JsonFieldCastType, OrExpression } from "../expressions.js";
import { handleAndCriteria, handleNumericCriteria, handleOrCriteria, optimizeExpression } from "../search.js";

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
				case "address": {
					return handleOrCriteria(criteria.address, async (c) =>
						// @ts-ignore
						this.handleAddressCriteria(c),
					);
				}
				case "publicKey": {
					return handleOrCriteria(criteria.publicKey, async (c) =>
						// @ts-ignore
						this.handlePublicKeyCriteria(c),
					);
				}
				case "balance": {
					return handleOrCriteria(criteria.balance, async (c) =>
						// @ts-ignore
						handleNumericCriteria("nonce", c),
					);
				}
				case "nonce": {
					return handleOrCriteria(criteria.nonce, async (c) =>
						// @ts-ignore
						handleNumericCriteria("nonce", c),
					);
				}
				case "attributes": {
					return handleOrCriteria(criteria.attributes, async (c) =>
						// @ts-ignore
						this.handleAttributesCriteria(c),
					);
				}
				default: {
					return { op: "true" };
				}
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

	public static async handleAttributesCriteria(criteria: Record<string, any>): Promise<OrExpression<Wallet>> {
		return {
			expressions: await Promise.all(
				Object.entries(criteria).map(async ([k, v]) => {
					// flatten 'v' from object to dotted attribute path
					// { "validatorLastBlock":  { "id": "value" } } -> 'validatorLastBlock.id'
					if (isObject(v) && Object.keys(v).length === 1 && !["from", "to"].includes(Object.keys(v)[0])) {
						const nestedAttribute = Object.keys(v)[0];
						k = `${k}.${nestedAttribute}`;
						v = v[nestedAttribute];
					}

					return handleNumericCriteria<Wallet, "attributes">("attributes", v, {
						cast: this.inferAttributeCastType(k),
						fieldName: k,
						operator: "->>",
					});
				}),
			),
			op: "or",
		};
	}

	private static inferAttributeCastType(attribute: string): JsonFieldCastType | undefined {
		// Since object attributes can exist with arbitrary keys, we hardcode a list of 'numeric like' attributes
		// and treat the rest as is.

		/*
		walletAttributeRepository.set("balance", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("nonce", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("publicKey", Contracts.State.AttributeType.String);
		walletAttributeRepository.set("username", Contracts.State.AttributeType.String);
		walletAttributeRepository.set("validatorPublicKey", Contracts.State.AttributeType.String);
		walletAttributeRepository.set("validatorRank", Contracts.State.AttributeType.Number);
		walletAttributeRepository.set("validatorVoteBalance", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("validatorLastBlock", Contracts.State.AttributeType.Object);
		walletAttributeRepository.set("validatorForgedFees", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("validatorForgedRewards", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("validatorForgedTotal", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("validatorProducedBlocks", Contracts.State.AttributeType.Number);
		walletAttributeRepository.set("validatorApproval", Contracts.State.AttributeType.Number);
		walletAttributeRepository.set("validatorResigned", Contracts.State.AttributeType.Boolean);
		*/

		if (
			[
				"balance",
				"nonce",
				"validatorRank",
				"validatorVoteBalance",
				"validatorForgedFees",
				"validatorForgedRewards",
				"validatorForgedTotal",
				"validatorProducedBlocks",
				"validatorLastBlock.height",
				"validatorLastBlock.timestamp",
			].includes(attribute)
		) {
			return "bigint";
		}

		if (["validatorApproval"].includes(attribute)) {
			return "numeric";
		}

		return undefined;
	}
}
