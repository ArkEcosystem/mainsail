import { calculateForgingInfo } from "./calculate-forging-info";
import { calculateRound, isNewRound } from "./round-calculator";
export * from "./assert";
export * as IpAddress from "./ip-address";
export * from "./lock";
export * from "@arkecosystem/utils";

export const roundCalculator = { calculateRound, isNewRound };
export const forgingInfoCalculator = { calculateForgingInfo };

export { isBlacklisted } from "./is-blacklisted";
export { getBlockNotChainedErrorMessage, isBlockChained } from "./is-block-chained";
export { isWhitelisted } from "./is-whitelisted";
