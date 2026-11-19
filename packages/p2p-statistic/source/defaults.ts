import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	// Peers whose requests are kept apart within one round; what goes beyond is still counted in the totals.
	maxTrackedPeers: Environment.get(EnvironmentVariables.MAINSAIL_P2P_STATISTIC_MAX_TRACKED_PEERS, 250),
	// What is logged at the end of a round: 0 one line, 1 also the endpoints, 2 also the peers, 3 also
	// the response times of every peer and endpoint.
	verbosity: Environment.get(EnvironmentVariables.MAINSAIL_P2P_STATISTIC_VERBOSITY, 0),
};
