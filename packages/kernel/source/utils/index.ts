import { calculateRound, isNewRound } from "./round-calculator";
export * from "./assert";
export * as IpAddress from "./ip-address";
export * from "./lock";
export * from "@mainsail/utils";

export const roundCalculator = { calculateRound, isNewRound };

export { isBlacklisted } from "./is-blacklisted";
export { getBlockNotChainedErrorMessage, isBlockChained } from "./is-block-chained";
export { isWhitelisted } from "./is-whitelisted";
