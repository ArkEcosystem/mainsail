import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	blacklist: [],
	maxPeersBroadcast: Environment.get(Constants.EnvironmentVariables.CORE_TRANSACTION_POOL_MAX_PEER_BROADCAST, 3),
	maxSequentialErrors: Environment.get(
		Constants.EnvironmentVariables.CORE_TRANSACTION_POOL_MAX_PEER_SEQUENTIAL_ERRORS,
		2,
	),
	whitelist: ["*"],
};
