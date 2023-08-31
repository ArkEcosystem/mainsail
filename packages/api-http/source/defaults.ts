export const defaults = {
	database: {
		applicationName: "mainsail/api-http",
		database: process.env.CORE_DB_DATABASE || `${process.env.CORE_TOKEN}_${process.env.CORE_NETWORK_NAME}`,
		dropSchema: false,
		entityPrefix: "public.",
		// TODO
		extra: {
			options: "-c statement_timeout=3000ms",
		},

		host: process.env.CORE_DB_HOST || "localhost",

		// TODO
		logger: "simple-console",

		logging: true,

		password: process.env.CORE_DB_PASSWORD || "password",

		port: process.env.CORE_DB_PORT || 5432,

		synchronize: false,

		type: "postgres",
		username: process.env.CORE_DB_USERNAME || process.env.CORE_TOKEN,
	},
	options: {
		estimateTotalCount: !process.env.CORE_API_NO_ESTIMATED_TOTAL_COUNT,
	},
	plugins: {
		cache: {
			checkperiod: 120,
			enabled: !!process.env.CORE_API_CACHE,
			stdTTL: 8,
		},
		log: {
			enabled: !!process.env.CORE_API_LOG,
		},
		pagination: {
			limit: 100,
		},
		rateLimit: {
			blacklist: process.env.CORE_API_RATE_LIMIT_BLACKLIST
				? process.env.CORE_API_RATE_LIMIT_BLACKLIST.split(",")
				: [],
			duration: process.env.CORE_API_RATE_LIMIT_USER_EXPIRES || 60,
			enabled: !process.env.CORE_API_RATE_LIMIT_DISABLED,
			points: process.env.CORE_API_RATE_LIMIT_USER_LIMIT || 100,
			// Sec
			whitelist: process.env.CORE_API_RATE_LIMIT_WHITELIST
				? process.env.CORE_API_RATE_LIMIT_WHITELIST.split(",")
				: [],
		},
		socketTimeout: 5000,
		trustProxy: !!process.env.CORE_API_TRUST_PROXY,
		whitelist: ["*"],
	},
	server: {
		http: {
			enabled: !process.env.CORE_API_DISABLED,
			host: process.env.CORE_API_HOST || "0.0.0.0",
			port: process.env.CORE_API_PORT || 4006, // TODO
		},
		// @see https://hapijs.com/api#-serveroptionstls
		https: {
			enabled: !!process.env.CORE_API_SSL,
			host: process.env.CORE_API_SSL_HOST || "0.0.0.0",
			port: process.env.CORE_API_SSL_PORT || 8443,
			tls: {
				cert: process.env.CORE_API_SSL_CERT,
				key: process.env.CORE_API_SSL_KEY,
			},
		},
	},
};
