import type { Block, Transaction } from "./crypto/index.js";
import type { RoundInfo } from "./shared/rounds.js";

export interface FeeCalculator {
	calculate(transaction: Transaction): bigint;
	calculateConsumed(gasPrice: number, gasUsed: bigint): bigint;
}

export interface RoundCalculator {
	isNewRound(height: number): boolean;
	calculateRound(height: number): RoundInfo;
	calculateRoundInfoByRound(round: number): RoundInfo;
}

export interface TimestampCalculator {
	calculateMinimalTimestamp(previousBlock: Block, round: number): number;
}

export interface ProposerCalculator {
	getValidatorIndex(round: number): number;
	getValidatorIndexFrom(roundValidators: number, totalRound: number, round: number): number;
}
