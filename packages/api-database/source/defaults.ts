import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	database: {
		applicationName: "mainsail/api-http",
		database: Environment.get(EnvironmentVariables.MAINSAIL_DB_DATABASE),
		entityPrefix: "public.",
		extra: {
			options: "-c statement_timeout=3000ms",
		},

		host: Environment.get(EnvironmentVariables.MAINSAIL_DB_HOST, "localhost"),

		logger: "simple-console",

		logging: Environment.isTrue(EnvironmentVariables.MAINSAIL_DB_LOGGING_ENABLED),

		password: Environment.get(EnvironmentVariables.MAINSAIL_DB_PASSWORD, "password"),

		port: Environment.get(EnvironmentVariables.MAINSAIL_DB_PORT, 5432),

		type: "postgres",
		username: Environment.get(EnvironmentVariables.MAINSAIL_DB_USERNAME),
	},
	enabled: Environment.isTrue(EnvironmentVariables.MAINSAIL_API_SYNC_ENABLED),
};
