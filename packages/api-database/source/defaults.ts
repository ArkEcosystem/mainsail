import { Constants } from "@mainsail/contracts";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	database: {
		applicationName: "mainsail/api-http",
		database:
			Environment.get(Constants.EnvironmentVariables.MAINSAIL_DB_DATABASE) ??
			`${Environment.get(Constants.EnvironmentVariables.MAINSAIL_TOKEN)}_${Environment.get(Constants.EnvironmentVariables.MAINSAIL_NETWORK_NAME)}`,
		entityPrefix: "public.",
		// TODO
		extra: {
			options: "-c statement_timeout=3000ms",
		},

		host: Environment.get(Constants.EnvironmentVariables.MAINSAIL_DB_HOST, "localhost"),

		logger: "simple-console",

		logging: Environment.isTrue(Constants.EnvironmentVariables.MAINSAIL_DB_LOGGING_ENABLED),

		password: Environment.get(Constants.EnvironmentVariables.MAINSAIL_DB_PASSWORD, "password"),

		port: Environment.get(Constants.EnvironmentVariables.MAINSAIL_DB_PORT, 5432),

		type: "postgres",
		username:
			Environment.get(Constants.EnvironmentVariables.MAINSAIL_DB_USERNAME) ??
			Environment.get(Constants.EnvironmentVariables.MAINSAIL_TOKEN),
	},
	enabled: Environment.isTrue(Constants.EnvironmentVariables.MAINSAIL_API_SYNC_ENABLED),
};
