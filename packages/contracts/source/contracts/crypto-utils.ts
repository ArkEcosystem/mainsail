import { BigNumber } from "@mainsail/utils";

import { Configuration, Transaction } from "./crypto/index.js";
import { RoundInfo } from "./shared/rounds.js";

export interface FeeCalculator {
	calculate(transaction: Transaction): BigNumber;
	calculateConsumed(gasPrice: number, gasUsed: number): BigNumber;
}

export interface RoundCalculator {
	isNewRound(height: number, configuration: Configuration): boolean;
	calculateRound(height: number, configuration: Configuration): RoundInfo;
	calculateRoundInfoByRound(round: number, configuration: Configuration): RoundInfo;
}
