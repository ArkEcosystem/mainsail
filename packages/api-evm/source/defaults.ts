import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	plugins: {
		pagination: {
			limit: 100,
		},
		rateLimit: {
			blacklist:
				Environment.get<undefined>(Constants.EnvironmentVariables.CORE_API_DEV_RATE_LIMIT_BLACKLIST)?.split(
					",",
				) ?? [],
			duration: Environment.get(Constants.EnvironmentVariables.CORE_API_DEV_RATE_LIMIT_USER_EXPIRES, 60), // Sec
			enabled: Environment.isTrue(Constants.EnvironmentVariables.CORE_API_DEV_RATE_LIMIT_DISABLED),
			points: Environment.get(Constants.EnvironmentVariables.CORE_API_DEV_RATE_LIMIT_USER_LIMIT, 100),

			whitelist:
				Environment.get<undefined>(Constants.EnvironmentVariables.CORE_API_DEV_RATE_LIMIT_WHITELIST)?.split(
					",",
				) ?? [],
		},
		socketTimeout: 5000,
		trustProxy: Environment.isTrue(Constants.EnvironmentVariables.CORE_API_DEV_TRUST_PROXY),
		whitelist: ["*"],
	},
	server: {
		http: {
			enabled: Environment.isTrue(Constants.EnvironmentVariables.CORE_API_DEV_ENABLED),
			host: Environment.get(Constants.EnvironmentVariables.CORE_API_DEV_HOST, "127.0.0.1"),
			port: Environment.get(Constants.EnvironmentVariables.CORE_API_DEV_PORT, 4006),
		},
		https: {
			enabled: Environment.isTrue(Constants.EnvironmentVariables.CORE_API_DEV_SSL),
			host: Environment.get(Constants.EnvironmentVariables.CORE_API_DEV_SSL_HOST, "127.0.0.1"),
			port: Environment.get(Constants.EnvironmentVariables.CORE_API_DEV_SSL_PORT, 8446),
			tls: {
				cert: Environment.get(Constants.EnvironmentVariables.CORE_API_DEV_SSL_CERT),
				key: Environment.get(Constants.EnvironmentVariables.CORE_API_DEV_SSL_KEY),
			},
		},
	},
};
