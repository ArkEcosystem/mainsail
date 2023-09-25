import { Contracts } from "@mainsail/contracts";

import { Transaction } from "../../models";
import { EqualCriteria, OrTransactionCriteria, TransactionCriteria } from "../criteria";
import { AndExpression, EqualExpression, Expression } from "../expressions";
import {
	handleAndCriteria,
	handleNumericCriteria,
	handleOrCriteria,
	hasOrCriteria,
	optimizeExpression,
} from "../search";

export class TransactionFilter {
	public static async getExpression(...criteria: OrTransactionCriteria[]): Promise<Expression<Transaction>> {
		const expressions = await Promise.all(
			criteria.map((c) => handleOrCriteria(c, (c) => this.handleTransactionCriteria(c))),
		);

		return optimizeExpression({ expressions, op: "and" });
	}

	private static async handleTransactionCriteria(criteria: TransactionCriteria): Promise<Expression<Transaction>> {
		const expression: Expression<Transaction> = await handleAndCriteria(criteria, async (key) => {
			switch (key) {
				case "address":
					return handleOrCriteria(criteria.address, async (c) =>
						// @ts-ignore
						this.handleAddressCriteria(c),
					);
				case "senderId":
					return handleOrCriteria(criteria.senderId, async (c) =>
						// @ts-ignore
						this.handleSenderIdCriteria(c),
					);
				case "recipientId":
					return handleOrCriteria(criteria.recipientId, async (c) =>
						// @ts-ignore
						this.handleRecipientIdCriteria(c),
					);
				case "id":
					return handleOrCriteria(criteria.id, async (c) => ({ op: "equal", property: "id", value: c }));
				case "version":
					return handleOrCriteria(criteria.version, async (c) => ({
						op: "equal",
						property: "version",
						value: c,
					}));
				case "blockId":
					return handleOrCriteria(criteria.blockId, async (c) => ({
						op: "equal",
						property: "blockId",
						value: c,
					}));
				case "sequence":
					return handleOrCriteria(criteria.sequence, async (c) =>
						// @ts-ignore
						handleNumericCriteria("sequence", c),
					);
				case "timestamp":
					return handleOrCriteria(criteria.timestamp, async (c) =>
						// @ts-ignore
						handleNumericCriteria("timestamp", c),
					);
				case "nonce":
					return handleOrCriteria(criteria.nonce, async (c) =>
						// @ts-ignore
						handleNumericCriteria("nonce", c),
					);
				case "senderPublicKey":
					return handleOrCriteria(criteria.senderPublicKey, async (c) => ({
						op: "equal",
						property: "senderPublicKey",
						value: c,
					}));
				case "type":
					return handleOrCriteria(criteria.type, async (c) => ({ op: "equal", property: "type", value: c }));
				case "typeGroup":
					return handleOrCriteria(criteria.typeGroup, async (c) => ({
						op: "equal",
						property: "typeGroup",
						value: c,
					}));
				case "vendorField":
					return handleOrCriteria(criteria.vendorField, async (c) =>
						// @ts-ignore
						({ op: "like", pattern: Buffer.from(c, "utf-8"), property: "vendorField" }),
					);
				case "amount":
					return handleOrCriteria(criteria.amount, async (c) =>
						// @ts-ignore
						handleNumericCriteria("amount", c),
					);
				case "fee":
					return handleOrCriteria(criteria.fee, async (c) =>
						// @ts-ignore
						handleNumericCriteria("fee", c),
					);
				case "asset":
					return handleOrCriteria(criteria.asset, async (c) =>
						// @ts-ignore
						this.handleAssetCriteria(c),
					);
				default:
					return { op: "true" };
			}
		});

		return { expressions: [expression, await this.getAutoTypeGroupExpression(criteria)], op: "and" };
	}

	private static async handleAddressCriteria(criteria: EqualCriteria<string>): Promise<Expression<Transaction>> {
		const expressions: Expression<Transaction>[] = await Promise.all([
			this.handleSenderIdCriteria(criteria),
			this.handleRecipientIdCriteria(criteria),
		]);

		return { expressions, op: "or" };
	}

	private static async handleSenderIdCriteria(criteria: EqualCriteria<string>): Promise<Expression<Transaction>> {
		// TODO: handle sender/recipient
		// if (this.walletRepository.hasByAddress(criteria)) {
		//     const senderWallet = this.walletRepository.findByAddress(criteria);

		//     if (senderWallet.getPublicKey()) {
		//         return { op: "equal", property: "senderPublicKey", value: senderWallet.getPublicKey() };
		//     }
		// }

		return { op: "false" };
	}

	private static async handleRecipientIdCriteria(criteria: EqualCriteria<string>): Promise<Expression<Transaction>> {
		const recipientIdExpression: EqualExpression<Transaction> = {
			op: "equal",
			property: "recipientId" as keyof Transaction,
			value: criteria,
		};

		const multipaymentRecipientIdExpression: AndExpression<Transaction> = {
			expressions: [
				{ op: "equal", property: "typeGroup", value: Contracts.Crypto.TransactionTypeGroup.Core },
				{ op: "equal", property: "type", value: Contracts.Crypto.TransactionType.MultiPayment },
				{ op: "contains", property: "asset", value: { payments: [{ recipientId: criteria }] } },
			],
			op: "and",
		};

		// TODO: handle sender/recipient
		// if (this.walletRepository.hasByAddress(criteria)) {
		//     const recipientWallet = this.walletRepository.findByAddress(criteria);
		//     if (recipientWallet && recipientWallet.getPublicKey()) {
		//         const delegateRegistrationExpression: AndExpression<Transaction> = {
		//             op: "and",
		//             expressions: [
		//                 { op: "equal", property: "typeGroup", value: Contracts.Crypto.TransactionTypeGroup.Core },
		//                 { op: "equal", property: "type", value: Contracts.Crypto.TransactionType.ValidatorRegistration },
		//                 { op: "equal", property: "senderPublicKey", value: recipientWallet.getPublicKey() },
		//             ],
		//         };

		//         return {
		//             op: "or",
		//             expressions: [
		//                 recipientIdExpression,
		//                 multipaymentRecipientIdExpression,
		//                 delegateRegistrationExpression,
		//             ],
		//         };
		//     }
		// }

		return {
			expressions: [recipientIdExpression, multipaymentRecipientIdExpression],
			op: "or",
		};
	}

	private static async handleAssetCriteria(criteria: TransactionCriteria): Promise<Expression<Transaction>> {
		let castLimit = 5;

		const getCastValues = (value: unknown): unknown[] => {
			if (Array.isArray(value)) {
				let castValues: Array<unknown>[] = [[]];

				for (const item of value) {
					const itemCastValues = getCastValues(item);

					castValues = castValues.flatMap((castValue) =>
						itemCastValues.map((itemCastValue) => [...castValue, itemCastValue]),
					);
				}

				return castValues;
			}

			if (typeof value === "object" && value !== null) {
				let castValues: object[] = [{}];

				for (const key of Object.keys(value)) {
					const propertyCastValues = getCastValues(value[key]);

					castValues = castValues.flatMap((castValue) =>
						propertyCastValues.map((propertyCastValue) => ({ ...castValue, [key]: propertyCastValue })),
					);
				}

				return castValues;
			}

			if (typeof value === "string" && String(Number(value)) === value) {
				if (castLimit === 0) {
					throw new Error("Asset cast property limit reached");
				}
				castLimit--;

				return [value, Number(value)];
			}

			if (value === "true" || value === "false") {
				if (castLimit === 0) {
					throw new Error("Asset cast property limit reached");
				}
				castLimit--;

				return [value, value === "true"];
			}

			return [value];
		};

		const expressions: Expression<Transaction>[] = getCastValues(criteria).map((c) => ({
			op: "contains",
			property: "asset",
			value: c,
		}));

		return { expressions, op: "or" };
	}

	private static async getAutoTypeGroupExpression(criteria: TransactionCriteria): Promise<Expression<Transaction>> {
		if (hasOrCriteria(criteria.type) && hasOrCriteria(criteria.typeGroup) === false) {
			return { op: "equal", property: "typeGroup", value: Contracts.Crypto.TransactionTypeGroup.Core };
		} else {
			return { op: "true" };
		}
	}
}
