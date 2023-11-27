import { Environment } from "@mainsail/kernel";

export const defaults = {
	database: {
		applicationName: "mainsail/api-http",
		database:
			Environment.get("CORE_DB_DATABASE") ??
			`${Environment.get("CORE_TOKEN")}_${Environment.get("CORE_NETWORK_NAME")}`,
		entityPrefix: "public.",
		// TODO
		extra: {
			options: "-c statement_timeout=3000ms",
		},

		host: Environment.get("CORE_DB_HOST") || "localhost",

		logger: "simple-console",

		logging: Environment.isTrue("CORE_DB_LOGGING_ENABLED"),

		password: Environment.get("CORE_DB_PASSWORD", "password"),

		port: Environment.get("CORE_DB_PORT", 5432),

		type: "postgres",
		username: Environment.get("CORE_DB_USERNAME") ?? Environment.get("CORE_TOKEN"),
	},
};
