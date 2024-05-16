import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	apiNodes: Environment.get<undefined>(Constants.EnvironmentVariables.CORE_P2P_API_NODES)?.split(",") ?? [],
	// the accepted max content length (in bytes) when querying api nodes from other peers
	apiNodesMaxContentLength: Environment.get(
		Constants.EnvironmentVariables.CORE_P2P_API_NODES_MAX_CONTENT_LENGTH,
		25_000,
	),
	blacklist: [],
	developmentMode: {
		enabled: Environment.isTrue(Constants.EnvironmentVariables.CORE_P2P_DEVELOPMENT_MODE_ENABLED),
	},
	getBlocksTimeout: 30_000,
	maxPeersBroadcast: Environment.get(Constants.EnvironmentVariables.CORE_P2P_MAX_PEERS_BROADCAST, 4),
	maxSameSubnetPeers: Environment.get(Constants.EnvironmentVariables.CORE_P2P_MAX_PEERS_SAME_SUBNET, 5),
	minimumNetworkReach: Environment.get(Constants.EnvironmentVariables.CORE_P2P_MIN_NETWORK_REACH, 20),
	minimumVersions: ["^0.0.1"],

	peerBanTime: Environment.get(Constants.EnvironmentVariables.CORE_P2P_PEER_BAN_TIME, 3),

	rateLimit: Environment.get(Constants.EnvironmentVariables.CORE_P2P_RATE_LIMIT, 150),
	remoteAccess: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],
	server: {
		hostname: Environment.get(Constants.EnvironmentVariables.CORE_P2P_HOST, "0.0.0.0"),
		logLevel: Environment.get(Constants.EnvironmentVariables.CORE_NETWORK_NAME) === "testnet" ? 1 : 0,
		port: Environment.get(Constants.EnvironmentVariables.CORE_P2P_PORT, 4002),
	},
	verifyTimeout: 60_000,
	whitelist: ["*"],
};
