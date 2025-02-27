import { calculateApproval } from "./calculate-forging-info.js";
import { calculateRound, calculateRoundInfoByRound, isNewRound } from "./round-calculator.js";
import { calculateSupply } from "./supply-calculator.js";
import { calculateMinimalTimestamp } from "./timestamp-calculator.js";

export * as feeCalculator from "./fee-calculator.js";

export const roundCalculator = { calculateRound, calculateRoundInfoByRound, isNewRound };
export const supplyCalculator = { calculateSupply };
export const validatorCalculator = { calculateApproval };
export const timestampCalculator = { calculateMinimalTimestamp };

export { formatCurrency } from "./format-currency.js";
export { getBlockNotChainedErrorMessage, isBlockChained } from "./is-block-chained.js";
export { isMajority } from "./is-majority.js";
export { isMinority } from "./is-minority.js";
