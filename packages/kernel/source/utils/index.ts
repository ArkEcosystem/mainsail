import { calculateApproval } from "./calculate-forging-info";
import { calculateRound, isNewRound } from "./round-calculator";
import { calculateSupply } from "./supply-calculator";
import { calculateMinimalTimestamp } from "./timestamp-calculator";
export * from "./assert";
export * as IpAddress from "./ip-address";
export * from "./lock";
export * from "@mainsail/utils";

export const roundCalculator = { calculateRound, isNewRound };
export const supplyCalculator = { calculateSupply };
export const validatorCalculator = { calculateApproval };
export const timestampCalculator = { calculateMinimalTimestamp };

export { isBlacklisted } from "./is-blacklisted";
export { getBlockNotChainedErrorMessage, isBlockChained } from "./is-block-chained";
export { isMajority } from "./is-majority";
export { isMinority } from "./is-minority";
export { isWhitelisted } from "./is-whitelisted";
