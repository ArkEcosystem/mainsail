import { ITransaction } from "../crypto";

export interface Service {
	getPoolSize(): number;

	addTransaction(transaction: ITransaction): Promise<void>;
	readdTransactions(previouslyForgedTransactions?: ITransaction[]): Promise<void>;
	removeTransaction(transaction: ITransaction): Promise<void>;
	removeForgedTransaction(transaction: ITransaction): Promise<void>;
	cleanUp(): Promise<void>;
	flush(): Promise<void>;
}
