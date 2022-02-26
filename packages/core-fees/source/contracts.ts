import { ITransaction } from "@arkecosystem/core-crypto-contracts";

export interface FeeMatcher {
	throwIfCannotEnterPool(transaction: ITransaction): Promise<void>;
	throwIfCannotBroadcast(transaction: ITransaction): Promise<void>;
}

export interface ProcessorExtension {
	throwIfCannotBroadcast(transaction: ITransaction): Promise<void>;
}
