import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	plugins: {
		rateLimit: {
			blacklist:
				Environment.get<undefined>(EnvironmentVariables.MAINSAIL_API_EVM_RATE_LIMIT_BLACKLIST)?.split(",") ??
				[],
			duration: Environment.get(EnvironmentVariables.MAINSAIL_API_EVM_RATE_LIMIT_USER_EXPIRES, 60), // Sec
			enabled: !Environment.isTrue(EnvironmentVariables.MAINSAIL_API_EVM_RATE_LIMIT_DISABLED),
			points: Environment.get(EnvironmentVariables.MAINSAIL_API_EVM_RATE_LIMIT_USER_LIMIT, 150),

			whitelist:
				Environment.get<undefined>(EnvironmentVariables.MAINSAIL_API_EVM_RATE_LIMIT_WHITELIST)?.split(",") ??
				[],
		},
		socketTimeout: 5000,
		trustProxy: Environment.isTrue(EnvironmentVariables.MAINSAIL_API_EVM_TRUST_PROXY),
		whitelist: ["*"],
	},
	server: {
		http: {
			enabled: !Environment.isTrue(EnvironmentVariables.MAINSAIL_API_EVM_DISABLED),
			host: Environment.get(EnvironmentVariables.MAINSAIL_API_EVM_HOST, "127.0.0.1"),
			port: Environment.get(EnvironmentVariables.MAINSAIL_API_EVM_PORT, 4008),
		},
		https: {
			enabled: Environment.isTrue(EnvironmentVariables.MAINSAIL_API_EVM_SSL),
			host: Environment.get(EnvironmentVariables.MAINSAIL_API_EVM_SSL_HOST, "127.0.0.1"),
			port: Environment.get(EnvironmentVariables.MAINSAIL_API_EVM_SSL_PORT, 8446),
			tls: {
				cert: Environment.get(EnvironmentVariables.MAINSAIL_API_EVM_SSL_CERT),
				key: Environment.get(EnvironmentVariables.MAINSAIL_API_EVM_SSL_KEY),
			},
		},
	},
};
