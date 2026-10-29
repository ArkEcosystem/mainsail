import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

// Copied from @mainsail/p2p without the api-node, statistic, rate-limit and developmentMode options.
// The listening address lives in the @mainsail/p2p-websocket configuration.
export const defaults = {
	blacklist: [],
	getBlocksTimeout: 30_000,
	maxPeersBroadcast: Environment.get(EnvironmentVariables.MAINSAIL_P2P_MAX_PEERS_BROADCAST, 4),
	maxSameSubnetPeers: Environment.get(EnvironmentVariables.MAINSAIL_P2P_MAX_PEERS_SAME_SUBNET, 5),
	minimumNetworkReach: Environment.get(EnvironmentVariables.MAINSAIL_P2P_MIN_NETWORK_REACH, 20),
	minimumVersions: ["^0.0.1"],
	peerBanTime: Environment.get(EnvironmentVariables.MAINSAIL_P2P_PEER_BAN_TIME, 3),
	remoteAccess: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],
	skipPeerStateVerification: Environment.isTrue(EnvironmentVariables.MAINSAIL_SKIP_PEER_STATE_VERIFICATION),
	txPoolPort: Environment.get(EnvironmentVariables.MAINSAIL_API_TRANSACTION_POOL_PORT, 4007),
	verifyTimeout: 60_000,
	whitelist: ["*"],
};
