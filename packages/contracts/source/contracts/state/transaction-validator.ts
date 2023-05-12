import { ITransaction } from "../crypto";

export interface TransactionValidator {
	validate(transaction: ITransaction): Promise<void>;
}

export type TransactionValidatorFactory = () => TransactionValidator;
