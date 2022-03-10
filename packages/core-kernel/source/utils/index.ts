import { calculateForgingInfo } from "./calculate-forging-info";
import { calculateRound, isNewRound } from "./round-calculator";
import { calculate } from "./supply-calculator";
export * from "./assert";
export * as IpAddress from "./ip-address";
export * from "./ipc-handler";
export * from "./ipc-subprocess";
export * from "./lock";
export * from "@arkecosystem/utils";

export const roundCalculator = { calculateRound, isNewRound };
export const supplyCalculator = { calculate };
export const forgingInfoCalculator = { calculateForgingInfo };

export { formatTimestamp } from "./format-timestamp";
export { isBlacklisted } from "./is-blacklisted";
export { getBlockNotChainedErrorMessage, isBlockChained } from "./is-block-chained";
export { isWhitelisted } from "./is-whitelisted";
