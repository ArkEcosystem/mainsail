import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	maxPeersBroadcast: Environment.get(EnvironmentVariables.MAINSAIL_TRANSACTION_POOL_MAX_PEER_BROADCAST, 3),
	maxSequentialErrors: Environment.get(EnvironmentVariables.MAINSAIL_TRANSACTION_POOL_MAX_PEER_SEQUENTIAL_ERRORS, 2),
	postTimeout: Environment.get(EnvironmentVariables.MAINSAIL_TRANSACTION_POOL_PEER_POST_TIMEOUT, 5000),
	txPoolPort: Environment.get(EnvironmentVariables.MAINSAIL_API_TRANSACTION_POOL_PORT, 4007),
};
