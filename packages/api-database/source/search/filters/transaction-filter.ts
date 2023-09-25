import { Contracts } from "@mainsail/contracts";
import { handleAndCriteria, handleNumericCriteria, handleOrCriteria, hasOrCriteria, optimizeExpression } from "../search";
import { Transaction } from "../../models";
import { EqualCriteria, OrTransactionCriteria, TransactionCriteria } from "../criteria";
import { AndExpression, EqualExpression, Expression } from "../expressions";

export class TransactionFilter {
    public static async getExpression(
        ...criteria: OrTransactionCriteria[]
    ): Promise<Expression<Transaction>> {
        const expressions = await Promise.all(
            criteria.map((c) => handleOrCriteria(c, (c) => this.handleTransactionCriteria(c))),
        );

        return optimizeExpression({ op: "and", expressions });
    }

    private static async handleTransactionCriteria(
        criteria: TransactionCriteria,
    ): Promise<Expression<Transaction>> {
        const expression: Expression<Transaction> = await handleAndCriteria(criteria, async (key) => {
            switch (key) {
                case "address":
                    return handleOrCriteria(criteria.address!, async (c) => {
                        // @ts-ignore
                        return this.handleAddressCriteria(c);
                    });
                case "senderId":
                    return handleOrCriteria(criteria.senderId!, async (c) => {
                        // @ts-ignore
                        return this.handleSenderIdCriteria(c);
                    });
                case "recipientId":
                    return handleOrCriteria(criteria.recipientId!, async (c) => {
                        // @ts-ignore
                        return this.handleRecipientIdCriteria(c);
                    });
                case "id":
                    return handleOrCriteria(criteria.id!, async (c) => {
                        return { property: "id", op: "equal", value: c };
                    });
                case "version":
                    return handleOrCriteria(criteria.version!, async (c) => {
                        return { property: "version", op: "equal", value: c };
                    });
                case "blockId":
                    return handleOrCriteria(criteria.blockId!, async (c) => {
                        return { property: "blockId", op: "equal", value: c };
                    });
                case "sequence":
                    return handleOrCriteria(criteria.sequence!, async (c) => {
                        // @ts-ignore
                        return handleNumericCriteria("sequence", c);
                    });
                case "timestamp":
                    return handleOrCriteria(criteria.timestamp!, async (c) => {
                        // @ts-ignore
                        return handleNumericCriteria("timestamp", c);
                    });
                case "nonce":
                    return handleOrCriteria(criteria.nonce!, async (c) => {
                        // @ts-ignore
                        return handleNumericCriteria("nonce", c);
                    });
                case "senderPublicKey":
                    return handleOrCriteria(criteria.senderPublicKey!, async (c) => {
                        return { property: "senderPublicKey", op: "equal", value: c };
                    });
                case "type":
                    return handleOrCriteria(criteria.type!, async (c) => {
                        return { property: "type", op: "equal", value: c };
                    });
                case "typeGroup":
                    return handleOrCriteria(criteria.typeGroup!, async (c) => {
                        return { property: "typeGroup", op: "equal", value: c };
                    });
                case "vendorField":
                    return handleOrCriteria(criteria.vendorField!, async (c) => {
                        // @ts-ignore
                        return { property: "vendorField", op: "like", pattern: Buffer.from(c, "utf-8") };
                    });
                case "amount":
                    return handleOrCriteria(criteria.amount!, async (c) => {
                        // @ts-ignore
                        return handleNumericCriteria("amount", c);
                    });
                case "fee":
                    return handleOrCriteria(criteria.fee!, async (c) => {
                        // @ts-ignore
                        return handleNumericCriteria("fee", c);
                    });
                case "asset":
                    return handleOrCriteria(criteria.asset!, async (c) => {
                        // @ts-ignore
                        return this.handleAssetCriteria(c);
                    });
                default:
                    return { op: "true" };
            }
        });

        return { op: "and", expressions: [expression, await this.getAutoTypeGroupExpression(criteria)] };
    }

    private static async handleAddressCriteria(
        criteria: EqualCriteria<string>,
    ): Promise<Expression<Transaction>> {
        const expressions: Expression<Transaction>[] = await Promise.all([
            this.handleSenderIdCriteria(criteria),
            this.handleRecipientIdCriteria(criteria),
        ]);

        return { op: "or", expressions };
    }

    private static async handleSenderIdCriteria(
        criteria: EqualCriteria<string>,
    ): Promise<Expression<Transaction>> {
        // TODO: handle sender/recipient
        // if (this.walletRepository.hasByAddress(criteria)) {
        //     const senderWallet = this.walletRepository.findByAddress(criteria);

        //     if (senderWallet.getPublicKey()) {
        //         return { op: "equal", property: "senderPublicKey", value: senderWallet.getPublicKey() };
        //     }
        // }

        return { op: "false" };
    }

    private static async handleRecipientIdCriteria(
        criteria: EqualCriteria<string>,
    ): Promise<Expression<Transaction>> {
        const recipientIdExpression: EqualExpression<Transaction> = {
            op: "equal",
            property: "recipientId" as keyof Transaction,
            value: criteria,
        };

        const multipaymentRecipientIdExpression: AndExpression<Transaction> = {
            op: "and",
            expressions: [
                { op: "equal", property: "typeGroup", value: Contracts.Crypto.TransactionTypeGroup.Core },
                { op: "equal", property: "type", value: Contracts.Crypto.TransactionType.MultiPayment },
                { op: "contains", property: "asset", value: { payments: [{ recipientId: criteria }] } },
            ],
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
            op: "or",
            expressions: [recipientIdExpression, multipaymentRecipientIdExpression],
        };
    }

    private static async handleAssetCriteria(
        criteria: TransactionCriteria,
    ): Promise<Expression<Transaction>> {
        let castLimit = 5;

        const getCastValues = (value: unknown): unknown[] => {
            if (Array.isArray(value)) {
                let castValues: Array<unknown>[] = [[]];

                for (const item of value) {
                    const itemCastValues = getCastValues(item);

                    castValues = castValues.flatMap((castValue) => {
                        return itemCastValues.map((itemCastValue) => {
                            return [...castValue, itemCastValue];
                        });
                    });
                }

                return castValues;
            }

            if (typeof value === "object" && value !== null) {
                let castValues: object[] = [{}];

                for (const key of Object.keys(value)) {
                    const propertyCastValues = getCastValues(value[key]);

                    castValues = castValues.flatMap((castValue) => {
                        return propertyCastValues.map((propertyCastValue) => {
                            return { ...castValue, [key]: propertyCastValue };
                        });
                    });
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

        const expressions: Expression<Transaction>[] = getCastValues(criteria).map((c) => {
            return { property: "asset", op: "contains", value: c };
        });

        return { op: "or", expressions };
    }

    private static async getAutoTypeGroupExpression(
        criteria: TransactionCriteria,
    ): Promise<Expression<Transaction>> {
        if (hasOrCriteria(criteria.type) && hasOrCriteria(criteria.typeGroup) === false) {
            return { op: "equal", property: "typeGroup", value: Contracts.Crypto.TransactionTypeGroup.Core };
        } else {
            return { op: "true" };
        }
    }
}
