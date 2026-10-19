import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	apiNodes: Environment.get<undefined>(EnvironmentVariables.MAINSAIL_P2P_API_NODES)?.split(",") ?? [],
	// the accepted max content length (in bytes) when querying api nodes from other peers
	apiNodesMaxContentLength: Environment.get(EnvironmentVariables.MAINSAIL_P2P_API_NODES_MAX_CONTENT_LENGTH, 25_000),
	blacklist: [],
	developmentMode: {
		enabled: Environment.isTrue(EnvironmentVariables.MAINSAIL_P2P_DEVELOPMENT_MODE_ENABLED),
	},
	getBlocksTimeout: 30_000,
	maxConnections: Environment.get(EnvironmentVariables.MAINSAIL_P2P_MAX_CONNECTIONS, 500),
	maxPeersBroadcast: Environment.get(EnvironmentVariables.MAINSAIL_P2P_MAX_PEERS_BROADCAST, 4),
	maxSameSubnetPeers: Environment.get(EnvironmentVariables.MAINSAIL_P2P_MAX_PEERS_SAME_SUBNET, 5),
	minimumNetworkReach: Environment.get(EnvironmentVariables.MAINSAIL_P2P_MIN_NETWORK_REACH, 20),
	minimumVersions: ["^0.0.1"],
	peerBanTime: Environment.get(EnvironmentVariables.MAINSAIL_P2P_PEER_BAN_TIME, 3),
	rateLimit: Environment.get(EnvironmentVariables.MAINSAIL_P2P_RATE_LIMIT, 150),
	remoteAccess: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],
	server: {
		hostname: Environment.get(EnvironmentVariables.MAINSAIL_P2P_HOST, "0.0.0.0"),
		logLevel: Environment.get(EnvironmentVariables.MAINSAIL_P2P_LOG_LEVEL, 0),
		port: Environment.get(EnvironmentVariables.MAINSAIL_P2P_PORT, 4002),
	},
	skipPeerStateVerification: Environment.isTrue(EnvironmentVariables.MAINSAIL_SKIP_PEER_STATE_VERIFICATION),
	statistic: {
		maxTrackedPeers: Environment.get(EnvironmentVariables.MAINSAIL_P2P_STATISTIC_MAX_TRACKED_PEERS, 250),
		verbosity: Environment.get(EnvironmentVariables.MAINSAIL_P2P_STATISTIC_VERBOSITY, 0),
	},
	txPoolPort: Environment.get(EnvironmentVariables.MAINSAIL_API_TRANSACTION_POOL_PORT, 4007),
	verifyTimeout: 60_000,
	whitelist: ["*"],
};
