import { BigNumber } from "@mainsail/utils";

import { Block, Transaction } from "./crypto/index.js";
import { RoundInfo } from "./shared/rounds.js";

export interface FeeCalculator {
	calculate(transaction: Transaction): BigNumber;
	calculateConsumed(gasPrice: number, gasUsed: number): BigNumber;
}

export interface RoundCalculator {
	isNewRound(height: number): boolean;
	calculateRound(height: number): RoundInfo;
	calculateRoundInfoByRound(round: number): RoundInfo;
}

export interface SupplyCalculator {
	calculateSupply(height: number): BigNumber;
}

export interface TimestampCalculator {
	calculateMinimalTimestamp(previousBlock: Block, round: number): number;
}

export interface ProposerCalculator {
	getValidatorIndex(round: number): number;
}
