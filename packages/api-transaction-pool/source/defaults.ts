import { Environment } from "@mainsail/kernel";

export const defaults = {
	plugins: {
		pagination: {
			limit: 100,
		},
		socketTimeout: 5000,
		trustProxy: Environment.isSet("CORE_API_TRANSACTION_POOL_TRUST_PROXY"),
		whitelist: ["*"],
	},
	server: {
		http: {
			enabled: !Environment.isSet("CORE_API_TRANSACTION_POOL_DISABLED"),
			host: Environment.get("CORE_API_TRANSACTION_POOL_HOST", "0.0.0.0"),
			port: Environment.get("CORE_API_TRANSACTION_POOL_PORT", 4007),
		},
		// @see https://hapijs.com/api#-serveroptionstls
		https: {
			enabled: Environment.isSet("CORE_API_TRANSACTION_POOL_SSL"),
			host: Environment.get("CORE_API_TRANSACTION_POOL_SSL_HOST", "0.0.0.0"),
			port: Environment.get("CORE_API_TRANSACTION_POOL_SSL_PORT", 8447),
			tls: {
				cert: Environment.get("CORE_API_TRANSACTION_POOL_SSL_CERT"),
				key: Environment.get("CORE_API_TRANSACTION_POOL_SSL_KEY"),
			},
		},
	},
};
