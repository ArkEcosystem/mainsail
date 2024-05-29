import { BigNumber } from "@mainsail/utils";
import { Transaction } from "../crypto/transactions.js";

export interface GasFeeCalculator {
	calculate(transaction: Transaction): BigNumber;
	calculateConsumed(gasFee: BigNumber, gasUsed: number): BigNumber;
	gasLimit(transaction: Transaction): number;
}

export interface NativeGas {}
