import { Contracts } from "@mainsail/contracts";

let mockTransactions: Partial<Contracts.Crypto.Transaction>[] = [];

export const setTransactions = (transactions: Partial<Contracts.Crypto.Transaction>[]) => {
	mockTransactions = transactions;
};

export class CustomQueryIterable implements Partial<Contracts.TransactionPool.QueryIterable> {
	public transactions: Contracts.Crypto.Transaction[];

	public constructor(items) {
		this.transactions = items;
	}

	public *[Symbol.iterator](): Iterator<Contracts.Crypto.Transaction> {
		for (const transaction of this.transactions) {
			yield transaction;
		}
	}

	public whereId(id: any): any {
		return this;
	}

	public async has(): Promise<boolean> {
		return this.transactions.length > 0;
	}

	public async first(): Promise<Contracts.Crypto.Transaction> {
		return this.transactions[0];
	}
}

class TransactionPoolQueryMock implements Partial<Contracts.TransactionPool.Query> {
	public getFromHighestPriority(): Contracts.TransactionPool.QueryIterable {
		return new CustomQueryIterable(mockTransactions) as unknown as Contracts.TransactionPool.QueryIterable;
	}
}

export const instance = new TransactionPoolQueryMock();
