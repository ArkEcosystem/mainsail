import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	plugins: {
		pagination: {
			limit: 100,
		},
		socketTimeout: 5000,
		trustProxy: Environment.isTrue(Constants.EnvironmentVariables.CORE_TRANSACTION_POOL_SERVER_TRUST_PROXY),
		whitelist: ["*"],
	},
	server: {
		http: {
			enabled: !Environment.isTrue(Constants.EnvironmentVariables.CORE_TRANSACTION_POOL_SERVER_DISABLED),
			host: Environment.get(Constants.EnvironmentVariables.CORE_TRANSACTION_POOL_SERVER_HOST, "0.0.0.0"),
			port: Environment.get(Constants.EnvironmentVariables.CORE_TRANSACTION_POOL_SERVER_PORT, 4007),
		},
		// @see https://hapijs.com/api#-serveroptionstls
		https: {
			enabled: Environment.isTrue(Constants.EnvironmentVariables.CORE_TRANSACTION_POOL_SERVER_SSL),
			host: Environment.get(Constants.EnvironmentVariables.CORE_TRANSACTION_POOL_SERVER_SSL_HOST, "0.0.0.0"),
			port: Environment.get(Constants.EnvironmentVariables.CORE_TRANSACTION_POOL_SERVER_SSL_PORT, 8447),
			tls: {
				cert: Environment.get(Constants.EnvironmentVariables.CORE_TRANSACTION_POOL_SERVER_SSL_CERT),
				key: Environment.get(Constants.EnvironmentVariables.CORE_TRANSACTION_POOL_SERVER_SSL_KEY),
			},
		},
	},
};
