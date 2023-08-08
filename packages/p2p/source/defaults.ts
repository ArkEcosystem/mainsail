import { Constants } from "@mainsail/contracts";

export const defaults = {
	blacklist: [],
	developmentMode: {
		enabled: process.env[Constants.Flags.CORE_P2P_DEVELOPMENT_MODE_ENABLED] || false,
	},
	getBlocksTimeout: 30_000,
	maxPeerSequentialErrors: process.env[Constants.Flags.CORE_P2P_MAX_PEER_SEQUENTIAL_ERRORS] || 3,
	maxPeersBroadcast: 20,
	maxSameSubnetPeers: process.env[Constants.Flags.CORE_P2P_MAX_PEERS_SAME_SUBNET] || 5,
	minimumNetworkReach: process.env[Constants.Flags.CORE_P2P_MIN_NETWORK_REACH] || 20,
	minimumVersions: ["^0.0.1"],

	rateLimit: process.env[Constants.Flags.CORE_P2P_RATE_LIMIT] || 150,
	// max number of messages per second per socket connection
	rateLimitPostTransactions: process.env[Constants.Flags.CORE_P2P_RATE_LIMIT_POST_TRANSACTIONS] || 25,
	remoteAccess: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],
	server: {
		hostname: process.env[Constants.Flags.CORE_P2P_HOST] || "0.0.0.0",
		logLevel: process.env[Constants.Flags.CORE_NETWORK_NAME] === "testnet" ? 1 : 0,
		port: process.env[Constants.Flags.CORE_P2P_PORT] || 4002,
	},
	verifyTimeout: 60_000,
	whitelist: ["*"],
};
