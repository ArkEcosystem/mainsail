import { ITransaction } from "../crypto";

export interface DynamicFeeContext {
	transaction: ITransaction;
	addonBytes: number;
	satoshiPerByte: number;
	height: number;
}
