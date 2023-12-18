import { Transaction } from "../crypto";

export interface DynamicFeeContext {
	transaction: Transaction;
	addonBytes: number;
	satoshiPerByte: number;
	height: number;
}
