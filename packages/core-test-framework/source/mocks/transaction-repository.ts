import { Models, Repositories } from "../../../core-database";

export type FeeStatistics = {
	type: number;
	typeGroup: number;
	avg: number;
	min: number;
	max: number;
	sum: number;
};

let mockTransaction: Partial<Models.Transaction> | undefined;
let mockTransactions: Partial<Models.Transaction>[] = [];
let mockFeeStatistics: FeeStatistics[] = [];

export const setTransaction = (transaction: Partial<Models.Transaction> | undefined) => {
	mockTransaction = transaction;
};

export const setTransactions = (transactions: Partial<Models.Transaction>[]) => {
	mockTransactions = transactions;
};

export const setFeeStatistics = (feeStatistics: FeeStatistics[]) => {
	mockFeeStatistics = feeStatistics;
};

class TransactionRepositoryMock implements Partial<Repositories.TransactionRepository> {
	public async findByIdAndType(type: number, id: string): Promise<Models.Transaction | undefined> {
		return mockTransaction ? (mockTransaction as Models.Transaction) : undefined;
	}

	public async findById(id: string): Promise<Models.Transaction> {
		return mockTransaction as Models.Transaction;
	}

	public async findByType(type: number, typeGroup: number, limit?: number, offset?: number) {
		return mockTransactions as any;
	}

	public async findByIds(ids: any[]) {
		return mockTransactions as Models.Transaction[];
	}

	public async findReceivedTransactions(): Promise<{ recipientId: string; amount: string }[]> {
		return mockTransactions.map((x) => ({ amount: x.amount.toString(), recipientId: x.recipientId.toString() }));
	}

	public async getFeeStatistics(
		txTypes: Array<{ type: number; typeGroup: number }>,
		days: number,
		minFee?: number,
	): Promise<FeeStatistics[]> {
		return mockFeeStatistics;
	}
}

export const instance = new TransactionRepositoryMock();
