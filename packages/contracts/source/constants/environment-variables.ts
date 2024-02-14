type EnvironmentVariable = (typeof EnvironmentVariableNames)[number];

export const EnvironmentVariableNames = [
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
	"CORE_P2P_API_NODES_MAX_CONTENT_LENGTH",
	"CORE_P2P_API_NODES",
	"CORE_P2P_DEVELOPMENT_MODE_ENABLED",
	"CORE_P2P_HOST",
	"CORE_P2P_MAX_PEERS_BROADCAST",
	"CORE_P2P_MAX_PEERS_SAME_SUBNET",
	"CORE_P2P_MIN_NETWORK_REACH",
	"CORE_P2P_PEER_BAN_TIME",
	"CORE_P2P_PEER_LOG_EXTRA",
	"CORE_P2P_PORT",
	"CORE_P2P_RATE_LIMIT_POST_TRANSACTIONS",
	"CORE_P2P_RATE_LIMIT",
	"CORE_SKIP_PEER_STATE_VERIFICATION",
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

	// Worker
	"CORE_CRYPTO_WORKER_COUNT",
	"CORE_CRYPTO_WORKER_LOGGING_ENABLED",

	// Database
	"CORE_DB_HOST",
	"CORE_DB_PORT",
	"CORE_DB_DATABASE",
	"CORE_DB_USERNAME",
	"CORE_DB_PASSWORD",
	"CORE_DB_LOGGING_ENABLED",

	// API
	"CORE_API_NO_ESTIMATED_TOTAL_COUNT",
	"CORE_API_CACHE",
	"CORE_API_LOG",
	"CORE_API_RATE_LIMIT_BLACKLIST",
	"CORE_API_RATE_LIMIT_USER_EXPIRES",
	"CORE_API_RATE_LIMIT_DISABLED",
	"CORE_API_RATE_LIMIT_USER_LIMIT",
	"CORE_API_RATE_LIMIT_WHITELIST",
	"CORE_API_TRUST_PROXY",
	"CORE_API_DISABLED",
	"CORE_API_HOST",
	"CORE_API_PORT",
	"CORE_API_SSL",
	"CORE_API_SSL_HOST",
	"CORE_API_SSL_PORT",
	"CORE_API_SSL_CERT",
	"CORE_API_SSL_KEY",

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

export const EnvironmentVariables = EnvironmentVariableNames.reduce((item, flagName) => {
	item[flagName] = flagName;
	return item;
}, {}) as Record<EnvironmentVariable, string>;
