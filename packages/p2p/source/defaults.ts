import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	apiNodes: Environment.get<undefined>(Constants.Flags.CORE_P2P_API_NODES)?.split(",") ?? [],
	// the accepted max content length (in bytes) when querying api nodes from other peers
	apiNodesMaxContentLength: Environment.get(Constants.Flags.CORE_P2P_API_NODES_MAX_CONTENT_LENGTH, 25_000),
	blacklist: [],
	developmentMode: {
		enabled: Environment.isTrue(Constants.Flags.CORE_P2P_DEVELOPMENT_MODE_ENABLED),
	},
	getBlocksTimeout: 30_000,
	maxPeerSequentialErrors: Environment.get(Constants.Flags.CORE_P2P_MAX_PEER_SEQUENTIAL_ERRORS, 3),
	maxPeersBroadcast: 3,
	maxSameSubnetPeers: Environment.get(Constants.Flags.CORE_P2P_MAX_PEERS_SAME_SUBNET, 5),
	minimumNetworkReach: Environment.get(Constants.Flags.CORE_P2P_MIN_NETWORK_REACH, 20),
	minimumVersions: ["^0.0.1"],

	peerBanTime: Environment.get(Constants.Flags.CORE_P2P_PEER_BAN_TIME, 0),

	rateLimit: Environment.get(Constants.Flags.CORE_P2P_RATE_LIMIT, 150),
	// max number of messages per second per socket connection
	rateLimitPostTransactions: Environment.get(Constants.Flags.CORE_P2P_RATE_LIMIT_POST_TRANSACTIONS, 25),
	remoteAccess: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],
	server: {
		hostname: Environment.get(Constants.Flags.CORE_P2P_HOST, "0.0.0.0"),
		logLevel: Environment.get(Constants.Flags.CORE_NETWORK_NAME) === "testnet" ? 1 : 0,
		port: Environment.get(Constants.Flags.CORE_P2P_PORT, 4002),
	},
	verifyTimeout: 60_000,
	whitelist: ["*"],
};
