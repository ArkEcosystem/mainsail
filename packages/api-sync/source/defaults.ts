export const defaults = {
	database: {
		applicationName: "mainsail/api-sync",
		database: process.env.CORE_DB_DATABASE || `${process.env.CORE_TOKEN}_${process.env.CORE_NETWORK_NAME}`,
		// TODO
		dropSchema: true,

		entityPrefix: "public.",

		host: process.env.CORE_DB_HOST || "localhost",

		// TODO
		logger: "simple-console",

		// TODO
		logging: false,

		password: process.env.CORE_DB_PASSWORD || "password",

		port: process.env.CORE_DB_PORT || 5432,

		synchronize: true,

		type: "postgres",

		username: process.env.CORE_DB_USERNAME || process.env.CORE_TOKEN, // TODO
	},

	truncateDatabase: process.env.CORE_API_SYNC_TRUNCATE_DATABASE || false,
};
