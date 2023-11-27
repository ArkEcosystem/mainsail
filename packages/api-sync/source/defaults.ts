import { Environment } from "@mainsail/kernel";

export const defaults = {
	database: {
		applicationName: "mainsail/api-sync",
		database:
			Environment.get("CORE_DB_DATABASE") ??
			`${Environment.get("CORE_TOKEN")}_${Environment.get("CORE_NETWORK_NAME")}`,
		// TODO
		dropSchema: true,

		entityPrefix: "public.",

		host: Environment.get("CORE_DB_HOST", "localhost"),

		// TODO
		logger: "simple-console",

		// TODO
		logging: false,

		password: Environment.get("CORE_DB_PASSWORD", "password"),

		port: Environment.get("CORE_DB_PORT" || 5432),

		synchronize: true,

		type: "postgres",

		username: Environment.get("CORE_DB_USERNAME") ?? Environment.get("CORE_TOKEN"), // TODO
	},

	truncateDatabase: Environment.isTrue("CORE_API_SYNC_TRUNCATE_DATABASE"),
};
