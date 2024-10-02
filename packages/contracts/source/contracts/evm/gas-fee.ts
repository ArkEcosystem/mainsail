import { BigNumber } from "@mainsail/utils";

import { Transaction } from "../crypto/transactions.js";

export interface GasFeeCalculator {
	calculate(transaction: Transaction): BigNumber;
	calculateConsumed(gasFee: number, gasUsed: number): BigNumber;
}

export interface GasLimits {
	of(transaction: Transaction): number;
}
