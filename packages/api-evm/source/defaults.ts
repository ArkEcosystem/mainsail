import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	plugins: {
		rateLimit: {
			blacklist:
				Environment.get<undefined>(Constants.EnvironmentVariables.CORE_API_EVM_RATE_LIMIT_BLACKLIST)?.split(
					",",
				) ?? [],
			duration: Environment.get(Constants.EnvironmentVariables.CORE_API_EVM_RATE_LIMIT_USER_EXPIRES, 60), // Sec
			enabled: !Environment.isTrue(Constants.EnvironmentVariables.CORE_API_EVM_RATE_LIMIT_DISABLED),
			points: Environment.get(Constants.EnvironmentVariables.CORE_API_EVM_RATE_LIMIT_USER_LIMIT, 1),

			whitelist:
				Environment.get<undefined>(Constants.EnvironmentVariables.CORE_API_EVM_RATE_LIMIT_WHITELIST)?.split(
					",",
				) ?? [],
		},
		socketTimeout: 5000,
		trustProxy: Environment.isTrue(Constants.EnvironmentVariables.CORE_API_EVM_TRUST_PROXY),
		whitelist: ["*"],
	},
	server: {
		http: {
			enabled: Environment.isTrue(Constants.EnvironmentVariables.CORE_API_EVM_ENABLED),
			host: Environment.get(Constants.EnvironmentVariables.CORE_API_EVM_HOST, "127.0.0.1"),
			port: Environment.get(Constants.EnvironmentVariables.CORE_API_EVM_PORT, 4008),
		},
		https: {
			enabled: Environment.isTrue(Constants.EnvironmentVariables.CORE_API_EVM_SSL),
			host: Environment.get(Constants.EnvironmentVariables.CORE_API_EVM_SSL_HOST, "127.0.0.1"),
			port: Environment.get(Constants.EnvironmentVariables.CORE_API_EVM_SSL_PORT, 8446),
			tls: {
				cert: Environment.get(Constants.EnvironmentVariables.CORE_API_EVM_SSL_CERT),
				key: Environment.get(Constants.EnvironmentVariables.CORE_API_EVM_SSL_KEY),
			},
		},
	},
};
