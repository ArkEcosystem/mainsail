import Interfaces from "@arkecosystem/core-crypto-contracts";

export interface Service {
	getPoolSize(): number;

	addTransaction(transaction: Interfaces.ITransaction): Promise<void>;
	readdTransactions(previouslyForgedTransactions?: Interfaces.ITransaction[]): Promise<void>;
	removeTransaction(transaction: Interfaces.ITransaction): Promise<void>;
	removeForgedTransaction(transaction: Interfaces.ITransaction): Promise<void>;
	cleanUp(): Promise<void>;
	flush(): Promise<void>;
}
