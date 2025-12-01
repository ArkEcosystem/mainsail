import { EnvironmentVariables } from "@mainsail/constants";
import { Environment } from "@mainsail/kernel";

export const defaults = {
	database: {
		applicationName: "mainsail/snapshot-legacy",
		database:
			Environment.get(EnvironmentVariables.MAINSAIL_DB_DATABASE) ??
			`${Environment.get(EnvironmentVariables.MAINSAIL_TOKEN)}_${Environment.get(EnvironmentVariables.MAINSAIL_NETWORK_NAME)}`,
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
		username:
			Environment.get(EnvironmentVariables.MAINSAIL_DB_USERNAME) ??
			Environment.get(EnvironmentVariables.MAINSAIL_TOKEN),

		v3: {
			database: "ark_devnet",
			// when using podman
			// host: "host.containers.internal",
			host: "localhost",
			password: "test_db",
			port: 5432,
			user: "test_db",
		},
	},
};
