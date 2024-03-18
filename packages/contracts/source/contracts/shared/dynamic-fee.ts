import { Transaction } from "../crypto/transactions.js";

export interface DynamicFeeContext {
	transaction: Transaction;
	addonBytes: number;
	satoshiPerByte: number;
	height: number;
}
