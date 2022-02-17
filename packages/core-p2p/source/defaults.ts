export const defaults = {
	server: {
		hostname: process.env.CORE_P2P_HOST || "0.0.0.0",
		port: process.env.CORE_P2P_PORT || 4002,
		logLevel: process.env.CORE_NETWORK_NAME === "testnet" ? 1 : 0,
	},

	minimumVersions: ["^3.0", "^3.0.0-next.0", "^3.0.0-alpha.0"],

	minimumNetworkReach: process.env.CORE_P2P_MIN_NETWORK_REACH || 20,

	verifyTimeout: 60000,

	getBlocksTimeout: 30000,

	maxPeersBroadcast: 20,

	maxSameSubnetPeers: process.env.CORE_P2P_MAX_PEERS_SAME_SUBNET || 5,

	maxPeerSequentialErrors: process.env.CORE_P2P_MAX_PEER_SEQUENTIAL_ERRORS || 3,

	whitelist: ["*"],

	blacklist: [],

	remoteAccess: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],

	dns: [
		// Google
		"8.8.8.8",
		"8.8.4.4",
		// CloudFlare
		"1.1.1.1",
		"1.0.0.1",
		// OpenDNS
		"208.67.222.222",
		"208.67.220.220",
	],

	ntp: ["pool.ntp.org", "time.google.com"],

	rateLimit: process.env.CORE_P2P_RATE_LIMIT || 100, // max number of messages per second per socket connection
	rateLimitPostTransactions: process.env.CORE_P2P_RATE_LIMIT_POST_TRANSACTIONS || 25, // postTransactions endpoint
};
