import { Environment } from "@mainsail/kernel";

export const defaults = {
	options: {
		estimateTotalCount: !Environment.isSet("CORE_API_NO_ESTIMATED_TOTAL_COUNT"),
	},
	plugins: {
		cache: {
			checkperiod: 120,
			enabled: Environment.isSet("CORE_API_CACHE"),
			stdTTL: 8,
		},
		log: {
			enabled: Environment.isSet("CORE_API_LOG"),
		},
		pagination: {
			limit: 100,
		},
		rateLimit: {
			blacklist: Environment.get("CORE_API_RATE_LIMIT_BLACKLIST", "").split(","),
			duration: Environment.get("CORE_API_RATE_LIMIT_USER_EXPIRES", 60),
			enabled: !Environment.isSet("CORE_API_RATE_LIMIT_DISABLED"),
			points: Environment.get("CORE_API_RATE_LIMIT_USER_LIMIT", 100),
			whitelist: Environment.get("CORE_API_RATE_LIMIT_WHITELIST", "").split(","),
		},
		socketTimeout: 5000,
		trustProxy: Environment.isSet("CORE_API_TRUST_PROXY"),
		whitelist: ["*"],
	},
	server: {
		http: {
			enabled: !Environment.isSet("CORE_API_DISABLED"),
			host: Environment.get("CORE_API_HOST", "0.0.0.0"),
			port: Environment.get("CORE_API_PORT", 4003),
		},
		// @see https://hapijs.com/api#-serveroptionstls
		https: {
			enabled: Environment.isSet("CORE_API_SSL"),
			host: Environment.get("CORE_API_SSL_HOST", "0.0.0.0"),
			port: Environment.get("CORE_API_SSL_PORT", 8443),
			tls: {
				cert: Environment.get("CORE_API_SSL_CERT"),
				key: Environment.get("CORE_API_SSL_KEY"),
			},
		},
	},
};
