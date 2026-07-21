import type { Transaction, TransactionData } from "./crypto/index.js";
import type { CommitKey, Instance } from "./evm/index.js";

export type TransactionHandlerConstructor = new () => TransactionHandler;

export type TransactionHandlerContext = {
	evm: {
		instance: Instance;
		commitKey: CommitKey;
	};
};

export interface TransactionHandler {
	verify(transaction: Transaction): Promise<boolean>;
}

export interface TransactionHandlerRegistry {
	getRegisteredHandlers(): TransactionHandler[];

	getRegisteredHandlerByType(type: number, version?: number): TransactionHandler;

	getActivatedHandlers(): Promise<TransactionHandler[]>;

	getActivatedHandlerByType(type: number, version?: number): Promise<TransactionHandler>;

	getActivatedHandlerForData(transactionData: TransactionData): Promise<TransactionHandler>;
}

export interface TransactionHandlerProvider {
	isRegistrationRequired(): boolean;

	registerHandlers(): void;
}
