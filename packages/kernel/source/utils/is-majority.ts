import { Contracts } from "@mainsail/contracts";

export const isMajority = (size: number, configuration: Contracts.Crypto.IConfiguration): boolean =>
	size >= (configuration.getMilestone().activeValidators / 3) * 2 + 1;
