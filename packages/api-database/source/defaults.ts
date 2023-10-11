export const defaults = {
	database: {
		applicationName: "mainsail/api-http",
		database: process.env.CORE_DB_DATABASE || `${process.env.CORE_TOKEN}_${process.env.CORE_NETWORK_NAME}`,
		entityPrefix: "public.",
		// TODO
		extra: {
			options: "-c statement_timeout=3000ms",
		},

		host: process.env.CORE_DB_HOST || "localhost",

		logger: "simple-console",

		logging: process.env.CORE_DB_LOGGING_ENABLED || false,

		password: process.env.CORE_DB_PASSWORD || "password",

		port: process.env.CORE_DB_PORT || 5432,

		type: "postgres",
		username: process.env.CORE_DB_USERNAME || process.env.CORE_TOKEN,
	},
};
