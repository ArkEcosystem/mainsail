import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	options: {
		estimateTotalCount: !Environment.isTrue(EnvironmentVariables.MAINSAIL_API_NO_ESTIMATED_TOTAL_COUNT),
	},
	plugins: {
		cache: {
			checkperiod: 120,
			enabled: Environment.isTrue(EnvironmentVariables.MAINSAIL_API_CACHE),
			stdTTL: 8,
		},
		log: {
			enabled: Environment.isTrue(EnvironmentVariables.MAINSAIL_API_LOG),
		},
		pagination: {
			limit: 100,
		},
		rateLimit: {
			blacklist:
				Environment.get<undefined>(EnvironmentVariables.MAINSAIL_API_RATE_LIMIT_BLACKLIST)?.split(",") ?? [],
			duration: Environment.get(EnvironmentVariables.MAINSAIL_API_RATE_LIMIT_USER_EXPIRES, 60),
			enabled: !Environment.isTrue(EnvironmentVariables.MAINSAIL_API_RATE_LIMIT_DISABLED),
			points: Environment.get(EnvironmentVariables.MAINSAIL_API_RATE_LIMIT_USER_LIMIT, 100),
			whitelist:
				Environment.get<undefined>(EnvironmentVariables.MAINSAIL_API_RATE_LIMIT_WHITELIST)?.split(",") ?? [],
		},
		socketTimeout: 5000,
		trustProxy: Environment.isTrue(EnvironmentVariables.MAINSAIL_API_TRUST_PROXY),
		whitelist: ["*"],
	},
	server: {
		http: {
			enabled: !Environment.isTrue(EnvironmentVariables.MAINSAIL_API_DISABLED),
			host: Environment.get(EnvironmentVariables.MAINSAIL_API_HOST, "0.0.0.0"),
			port: Environment.get(EnvironmentVariables.MAINSAIL_API_PORT, 4003),
		},
		https: {
			enabled: Environment.isTrue(EnvironmentVariables.MAINSAIL_API_SSL),
			host: Environment.get(EnvironmentVariables.MAINSAIL_API_SSL_HOST, "0.0.0.0"),
			port: Environment.get(EnvironmentVariables.MAINSAIL_API_SSL_PORT, 8443),
			tls: {
				cert: Environment.get(EnvironmentVariables.MAINSAIL_API_SSL_CERT),
				key: Environment.get(EnvironmentVariables.MAINSAIL_API_SSL_KEY),
			},
		},
	},
};
