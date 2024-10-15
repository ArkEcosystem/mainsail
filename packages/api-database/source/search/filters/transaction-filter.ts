import { WalletRepository } from "../../contracts.js";
import { Transaction } from "../../models/index.js";
import { EqualCriteria, OrTransactionCriteria, TransactionCriteria } from "../criteria.js";
import { Expression } from "../expressions.js";
import { handleAndCriteria, handleComparisonCriteria, handleOrCriteria, optimizeExpression } from "../search.js";

export class TransactionFilter {
	public static async getExpression(
		walletRepository: WalletRepository,
		...criteria: OrTransactionCriteria[]
	): Promise<Expression<Transaction>> {
		const expressions = await Promise.all(
			criteria.map((c) => handleOrCriteria(c, (c) => this.handleTransactionCriteria(c, walletRepository))),
		);

		return optimizeExpression({ expressions, op: "and" });
	}

	private static async handleTransactionCriteria(
		criteria: TransactionCriteria,
		walletRepository,
	): Promise<Expression<Transaction>> {
		const expression: Expression<Transaction> = await handleAndCriteria(criteria, async (key) => {
			switch (key) {
				case "address": {
					return handleOrCriteria(criteria.address, async (c) =>
						// @ts-ignore
						this.handleAddressCriteria(c, walletRepository),
					);
				}
				case "senderId": {
					return handleOrCriteria(criteria.senderId, async (c) =>
						// @ts-ignore
						this.handleSenderIdCriteria(c, walletRepository),
					);
				}
				case "recipientId": {
					return handleOrCriteria(criteria.recipientId, async (c) =>
						// @ts-ignore
						this.handleRecipientAddressCriteria(c),
					);
				}
				case "id": {
					return handleOrCriteria(criteria.id, async (c) => ({ op: "equal", property: "id", value: c }));
				}
				case "blockId": {
					return handleOrCriteria(criteria.blockId, async (c) => ({
						op: "equal",
						property: "blockId",
						value: c,
					}));
				}
				case "sequence": {
					return handleOrCriteria(criteria.sequence, async (c) =>
						// @ts-ignore
						handleComparisonCriteria("sequence", c),
					);
				}
				case "timestamp": {
					return handleOrCriteria(criteria.timestamp, async (c) =>
						// @ts-ignore
						handleComparisonCriteria("timestamp", c),
					);
				}
				case "nonce": {
					return handleOrCriteria(criteria.nonce, async (c) =>
						// @ts-ignore
						handleComparisonCriteria("nonce", c),
					);
				}
				case "senderPublicKey": {
					return handleOrCriteria(criteria.senderPublicKey, async (c) =>
						// @ts-ignore
						this.handleSenderPublicKeyCriteria(c),
					);
				}
				// case "senderAddress": {
				// 	return handleOrCriteria(criteria.senderAddress, async (c) =>
				// 		// @ts-ignore
				// 		this.handleSenderPublicKeyCriteria(c),
				// 	);
				// }
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
				default: {
					return { op: "true" };
				}
			}
		});

		return { expressions: [expression], op: "and" };
	}

	private static async handleAddressCriteria(
		criteria: EqualCriteria<string>,
		walletRepository: WalletRepository,
	): Promise<Expression<Transaction>> {
		const expressions: Expression<Transaction>[] = await Promise.all([
			this.handleSenderIdCriteria(criteria, walletRepository),
			this.handleRecipientAddressCriteria(criteria),
		]);

		return { expressions, op: "or" };
	}

	private static async handleSenderIdCriteria(
		criteria: EqualCriteria<string>,
		walletRepository: WalletRepository,
	): Promise<Expression<Transaction>> {
		const wallet = await walletRepository
			.createQueryBuilder()
			.select("public_key")
			.where("address = :address", { address: criteria })
			.getRawOne<{ public_key: string }>();

		if (!wallet || !wallet.public_key) {
			return { op: "false" };
		}

		return this.handleSenderPublicKeyCriteria(wallet.public_key);
	}

	private static async handleSenderPublicKeyCriteria(
		criteria: EqualCriteria<string>,
	): Promise<Expression<Transaction>> {
		return { op: "equal", property: "senderPublicKey", value: criteria };
	}

	private static async handleRecipientAddressCriteria(
		criteria: EqualCriteria<string>,
	): Promise<Expression<Transaction>> {
		return {
			op: "equal",
			property: "recipientAddress" as keyof Transaction,
			value: criteria,
		};
	}

	// private static async handleAssetCriteria(criteria: TransactionCriteria): Promise<Expression<Transaction>> {
	// 	let castLimit = 5;

	// 	const getCastValues = (value: unknown): unknown[] => {
	// 		if (Array.isArray(value)) {
	// 			let castValues: Array<unknown>[] = [[]];

	// 			for (const item of value) {
	// 				const itemCastValues = getCastValues(item);

	// 				castValues = castValues.flatMap((castValue) =>
	// 					itemCastValues.map((itemCastValue) => [...castValue, itemCastValue]),
	// 				);
	// 			}

	// 			return castValues;
	// 		}

	// 		if (typeof value === "object" && value !== null) {
	// 			let castValues: object[] = [{}];

	// 			for (const key of Object.keys(value)) {
	// 				const propertyCastValues = getCastValues(value[key]);

	// 				castValues = castValues.flatMap((castValue) =>
	// 					propertyCastValues.map((propertyCastValue) => ({ ...castValue, [key]: propertyCastValue })),
	// 				);
	// 			}

	// 			return castValues;
	// 		}

	// 		if (typeof value === "string" && String(Number(value)) === value) {
	// 			if (castLimit === 0) {
	// 				throw new Error("Asset cast property limit reached");
	// 			}
	// 			castLimit--;

	// 			return [value, Number(value)];
	// 		}

	// 		if (value === "true" || value === "false") {
	// 			if (castLimit === 0) {
	// 				throw new Error("Asset cast property limit reached");
	// 			}
	// 			castLimit--;

	// 			return [value, value === "true"];
	// 		}

	// 		return [value];
	// 	};

	// 	const expressions: Expression<Transaction>[] = getCastValues(criteria).map((c) => ({
	// 		op: "contains",
	// 		property: "asset",
	// 		value: c,
	// 	}));

	// 	return { expressions, op: "or" };
	// }
}
