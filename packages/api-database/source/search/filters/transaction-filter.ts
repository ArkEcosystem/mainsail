import { WalletRepository } from "../../contracts.js";
import { Transaction } from "../../models/index.js";
import { handleAndCriteria, handleComparisonCriteria, handleOrCriteria, optimizeExpression } from "../search.js";
import { EqualCriteria, OrTransactionCriteria, TransactionCriteria } from "../types/criteria.js";
import { Expression } from "../types/expressions.js";

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
				case "to": {
					return handleOrCriteria(criteria.to, async (c) =>
						// @ts-ignore
						this.handleRecipientAddressCriteria(c),
					);
				}
				case "hash": {
					return handleOrCriteria(criteria.hash, async (c) => ({ op: "equal", property: "hash", value: c }));
				}
				case "blockHash": {
					return handleOrCriteria(criteria.blockHash, async (c) => ({
						op: "equal",
						property: "blockHash",
						value: c,
					}));
				}
				case "transactionIndex": {
					return handleOrCriteria(criteria.transactionIndex, async (c) =>
						// @ts-ignore
						handleComparisonCriteria("transactionIndex", c),
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
				case "from": {
					return handleOrCriteria(criteria.from, async (c) =>
						// @ts-ignore
						this.handleSenderAddressCritera(c),
					);
				}
				case "value": {
					return handleOrCriteria(criteria.value, async (c) =>
						// @ts-ignore
						handleComparisonCriteria("value", c),
					);
				}
				case "gasPrice": {
					return handleOrCriteria(criteria.gasPrice, async (c) =>
						// @ts-ignore
						handleComparisonCriteria("gasPrice", c),
					);
				}
				case "data": {
					return handleOrCriteria(criteria.data, async (c) =>
						// @ts-ignore
						this.handleDataCritera(c),
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

	private static async handleSenderAddressCritera(criteria: EqualCriteria<string>): Promise<Expression<Transaction>> {
		return { op: "equal", property: "from", value: criteria };
	}

	private static async handleRecipientAddressCriteria(
		criteria: EqualCriteria<string>,
	): Promise<Expression<Transaction>> {
		return {
			op: "equal",
			property: "to" as keyof Transaction,
			value: criteria,
		};
	}

	private static async handleDataCritera(criteria: EqualCriteria<string>): Promise<Expression<Transaction>> {
		criteria = criteria.startsWith("0x") ? criteria.slice(2) : criteria;
		criteria = `\\x${criteria}`;

		return { op: "functionSig", property: "data", value: criteria };
	}
}
