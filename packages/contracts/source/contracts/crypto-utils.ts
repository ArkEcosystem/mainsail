import { BigNumber } from "@mainsail/utils";

import { Transaction } from "./crypto/index.js";

export interface FeeCalculator {
	calculate(transaction: Transaction): BigNumber;
	calculateConsumed(gasPrice: number, gasUsed: number): BigNumber;
}
