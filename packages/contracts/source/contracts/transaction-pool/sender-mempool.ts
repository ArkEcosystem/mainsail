import { BigNumber } from "@mainsail/utils";

import { Transaction } from "../crypto/transactions.js";

export interface SenderMempool {
	isDisposable(): boolean;
	getSize(): number;
	getNonce(): BigNumber;

	getFromEarliest(): Iterable<Transaction>;
	getFromLatest(): Iterable<Transaction>;

	addTransaction(transaction: Transaction): Promise<void>;
	removeTransaction(hash: string): Transaction[];
	replaceTransaction(transaction: Transaction): Promise<Transaction[]>;
	reAddTransactions(): Promise<Transaction[]>;
}

export type SenderMempoolFactory = (address: string, legacyAddress?: string) => Promise<SenderMempool>;
