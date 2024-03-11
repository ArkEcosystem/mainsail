import { calculateApproval } from "./calculate-forging-info.js";
import { calculateRound, isNewRound } from "./round-calculator.js";
import { calculateSupply } from "./supply-calculator.js";
import { calculateMinimalTimestamp } from "./timestamp-calculator.js";
export * from "./assert.js";
export * as IpAddress from "./ip-address.js";
export * from "./lock.js";
export * from "@mainsail/utils";

export const roundCalculator = { calculateRound, isNewRound };
export const supplyCalculator = { calculateSupply };
export const validatorCalculator = { calculateApproval };
export const timestampCalculator = { calculateMinimalTimestamp };

export { isBlacklisted } from "./is-blacklisted.js";
export { getBlockNotChainedErrorMessage, isBlockChained } from "./is-block-chained.js";
export { isMajority } from "./is-majority.js";
export { isMinority } from "./is-minority.js";
export { isWhitelisted } from "./is-whitelisted.js";
