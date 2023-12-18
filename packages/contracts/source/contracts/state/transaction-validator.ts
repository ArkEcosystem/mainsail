import { Transaction } from "../crypto";

export interface TransactionValidator {
	validate(transaction: Transaction): Promise<void>;
}

export type TransactionValidatorFactory = () => TransactionValidator;
