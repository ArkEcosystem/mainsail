type Flag = (typeof FlagNames)[number];

export const FlagNames = [
	// Log
	"CORE_LOG_LEVEL_FILE",
	"CORE_LOG_LEVEL",

	// Pool
	"CORE_MAX_TRANSACTIONS_IN_POOL",
	"CORE_TRANSACTION_POOL_DISABLED",
	"CORE_TRANSACTION_POOL_MAX_PER_REQUEST",
	"CORE_TRANSACTION_POOL_MAX_PER_SENDER",
	"CORE_RESET_DATABASE",
	"CORE_RESET_POOL",

	// P2P
	"CORE_P2P_HOST",
	"CORE_P2P_PORT",
	"CORE_P2P_MAX_PEERS_SAME_SUBNET",
	"CORE_P2P_MAX_PEER_SEQUENTIAL_ERRORS",
	"CORE_P2P_MIN_NETWORK_REACH",
	"CORE_P2P_RATE_LIMIT",
	"CORE_P2P_RATE_LIMIT_POST_TRANSACTIONS",
	"CORE_P2P_PEER_LOG_EXTRA",
	"CORE_P2P_PEER_BAN_TIME",
	"CORE_P2P_DEVELOPMENT_MODE_ENABLED",
	"CORE_SKIP_PEER_STATE_VERIFICATION",
	"CORE_P2P_API_NODES",
	"CORE_P2P_API_NODES_MAX_CONTENT_LENGTH",
	"DISABLE_P2P_SERVER",

	// Blockchain
	"CORE_SKIP_BLOCKCHAIN_STARTED_CHECK",

	// State
	"CORE_STATE_EXPORT_DISABLED",
	"CORE_STATE_EXPORT_INTERVAL",
	"CORE_STATE_EXPORT_RETAIN_FILES",

	// Webhooks
	"CORE_WEBHOOKS_ENABLED",
	"CORE_WEBHOOKS_HOST",
	"CORE_WEBHOOKS_PORT",
	"CORE_WEBHOOKS_TIMEOUT",

	// Cli
	"CORE_NPM_REGISTRY",

	// Other
	"CORE_NETWORK_NAME",
	"CORE_TOKEN",
	"CORE_VERSION",
	"CORE_ENV",
	"CORE_PATH_DATA",
	"CORE_PATH_CONFIG",
	"CORE_PATH_CACHE",
	"CORE_PATH_LOG",
	"CORE_PATH_TEMP",
] as const;

// TODO: DisconnectInvalidPeers

export const Flags = FlagNames.reduce((item, flagName) => {
	item[flagName] = flagName;
	return item;
}, {}) as Record<Flag, string>;
