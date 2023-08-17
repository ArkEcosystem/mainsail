import { Contracts } from "@mainsail/contracts";

export const isMinority = (size: number, configuration: Contracts.Crypto.IConfiguration): boolean => {
	return size >= configuration.getMilestone().activeValidators / 3 + 1;
};
