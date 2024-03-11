import { Transaction } from "../crypto/transactions.js";

export interface TransactionValidator {
	validate(transaction: Transaction): Promise<void>;
}

export type TransactionValidatorFactory = () => TransactionValidator;
