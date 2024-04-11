import { Transaction } from "../crypto/transactions.js";

export interface ExpirationService {
	canExpire(transaction: Transaction): boolean;
	isExpired(transaction: Transaction): Promise<boolean>;
	getExpirationHeight(transaction: Transaction): Promise<number>;
}
