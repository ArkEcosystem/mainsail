import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Container, Utils as AppUtils } from "@arkecosystem/core-kernel";

import { Transaction } from "./models/transaction";

const { handleAndCriteria, handleOrCriteria, handleNumericCriteria, optimizeExpression, hasOrCriteria } =
	AppUtils.Search;

@Container.injectable()
export class TransactionFilter implements Contracts.Database.TransactionFilter {
	@Container.inject(Identifiers.WalletRepository)
	@Container.tagged("state", "blockchain")
	private readonly walletRepository!: Contracts.State.WalletRepository;

	public async getExpression(
		...criteria: Contracts.Shared.OrTransactionCriteria[]
	): Promise<Contracts.Search.Expression<Transaction>> {
		const expressions = await Promise.all(
			criteria.map((c) => handleOrCriteria(c, (c) => this.handleTransactionCriteria(c))),
		);

		return optimizeExpression({ expressions, op: "and" });
	}

	private async handleTransactionCriteria(
		criteria: Contracts.Shared.TransactionCriteria,
	): Promise<Contracts.Search.Expression<Transaction>> {
		const expression: Contracts.Search.Expression<Transaction> = await handleAndCriteria(criteria, async (key) => {
			switch (key) {
				case "address":
					return handleOrCriteria(criteria.address, async (c) => this.handleAddressCriteria(c));
				case "senderId":
					return handleOrCriteria(criteria.senderId, async (c) => this.handleSenderIdCriteria(c));
				case "recipientId":
					return handleOrCriteria(criteria.recipientId, async (c) => this.handleRecipientIdCriteria(c));
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
					return handleOrCriteria(criteria.sequence, async (c) => handleNumericCriteria("sequence", c));
				case "timestamp":
					return handleOrCriteria(criteria.timestamp, async (c) => handleNumericCriteria("timestamp", c));
				case "nonce":
					return handleOrCriteria(criteria.nonce, async (c) => handleNumericCriteria("nonce", c));
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
					return handleOrCriteria(criteria.vendorField, async (c) => ({
						op: "like",
						pattern: c,
						property: "vendorField",
					}));
				case "amount":
					return handleOrCriteria(criteria.amount, async (c) => handleNumericCriteria("amount", c));
				case "fee":
					return handleOrCriteria(criteria.fee, async (c) => handleNumericCriteria("fee", c));
				case "asset":
					return handleOrCriteria(criteria.asset, async (c) => this.handleAssetCriteria(c));
				default:
					return { op: "true" };
			}
		});

		return { expressions: [expression, await this.getAutoTypeGroupExpression(criteria)], op: "and" };
	}

	private async handleAddressCriteria(
		criteria: Contracts.Search.EqualCriteria<string>,
	): Promise<Contracts.Search.Expression<Transaction>> {
		const expressions: Contracts.Search.Expression<Transaction>[] = await Promise.all([
			this.handleSenderIdCriteria(criteria),
			this.handleRecipientIdCriteria(criteria),
		]);

		return { expressions, op: "or" };
	}

	private async handleSenderIdCriteria(
		criteria: Contracts.Search.EqualCriteria<string>,
	): Promise<Contracts.Search.Expression<Transaction>> {
		const senderWallet = this.walletRepository.findByAddress(criteria);

		if (senderWallet && senderWallet.getPublicKey()) {
			return { op: "equal", property: "senderPublicKey", value: senderWallet.getPublicKey() };
		} else {
			return { op: "false" };
		}
	}

	private async handleRecipientIdCriteria(
		criteria: Contracts.Search.EqualCriteria<string>,
	): Promise<Contracts.Search.Expression<Transaction>> {
		const recipientIdExpression: Contracts.Search.EqualExpression<Transaction> = {
			op: "equal",
			property: "recipientId" as keyof Transaction,
			value: criteria,
		};

		const multipaymentRecipientIdExpression: Contracts.Search.AndExpression<Transaction> = {
			expressions: [
				{ op: "equal", property: "typeGroup", value: Crypto.TransactionTypeGroup.Core },
				{ op: "equal", property: "type", value: Crypto.TransactionType.MultiPayment },
				{ op: "contains", property: "asset", value: { payments: [{ recipientId: criteria }] } },
			],
			op: "and",
		};

		const recipientWallet = this.walletRepository.findByAddress(criteria);
		if (recipientWallet && recipientWallet.getPublicKey()) {
			const delegateRegistrationExpression: Contracts.Search.AndExpression<Transaction> = {
				expressions: [
					{ op: "equal", property: "typeGroup", value: Crypto.TransactionTypeGroup.Core },
					{ op: "equal", property: "type", value: Crypto.TransactionType.DelegateRegistration },
					{ op: "equal", property: "senderPublicKey", value: recipientWallet.getPublicKey() },
				],
				op: "and",
			};

			return {
				expressions: [recipientIdExpression, multipaymentRecipientIdExpression, delegateRegistrationExpression],
				op: "or",
			};
		} else {
			return {
				expressions: [recipientIdExpression, multipaymentRecipientIdExpression],
				op: "or",
			};
		}
	}

	private async handleAssetCriteria(
		criteria: Contracts.Shared.TransactionCriteria,
	): Promise<Contracts.Search.Expression<Transaction>> {
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

		const expressions: Contracts.Search.Expression<Transaction>[] = getCastValues(criteria).map((c) => ({
			op: "contains",
			property: "asset",
			value: c,
		}));

		return { expressions, op: "or" };
	}

	private async getAutoTypeGroupExpression(
		criteria: Contracts.Shared.TransactionCriteria,
	): Promise<Contracts.Search.Expression<Transaction>> {
		if (hasOrCriteria(criteria.type) && hasOrCriteria(criteria.typeGroup) === false) {
			return { op: "equal", property: "typeGroup", value: Crypto.TransactionTypeGroup.Core };
		} else {
			return { op: "true" };
		}
	}
}
