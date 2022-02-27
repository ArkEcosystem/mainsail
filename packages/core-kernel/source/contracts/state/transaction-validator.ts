import Interfaces from "@arkecosystem/core-crypto-contracts";

export interface TransactionValidator {
	validate(transaction: Interfaces.ITransaction): Promise<void>;
}

export type TransactionValidatorFactory = () => TransactionValidator;
