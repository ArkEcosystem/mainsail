export const defaults = {
	options: {
		estimateTotalCount: !process.env.CORE_API_DEV_NO_ESTIMATED_TOTAL_COUNT,
	},
	plugins: {
		cache: {
			checkperiod: 120,
			enabled: !!process.env.CORE_API_DEV_CACHE,
			stdTTL: 8,
		},
		log: {
			enabled: !!process.env.CORE_API_DEV_LOG,
		},
		pagination: {
			limit: 100,
		},
		rateLimit: {
			blacklist: process.env.CORE_API_DEV_RATE_LIMIT_BLACKLIST
				? process.env.CORE_API_DEV_RATE_LIMIT_BLACKLIST.split(",")
				: [],
			duration: process.env.CORE_API_DEV_RATE_LIMIT_USER_EXPIRES || 60,
			enabled: !process.env.CORE_API_DEV_RATE_LIMIT_DISABLED,
			points: process.env.CORE_API_DEV_RATE_LIMIT_USER_LIMIT || 100,
			// Sec
			whitelist: process.env.CORE_API_DEV_RATE_LIMIT_WHITELIST
				? process.env.CORE_API_DEV_RATE_LIMIT_WHITELIST.split(",")
				: [],
		},
		socketTimeout: 5000,
		trustProxy: !!process.env.CORE_API_DEV_TRUST_PROXY,
		whitelist: ["*"],
	},
	server: {
		http: {
			enabled: !process.env.CORE_API_DEV_DISABLED,
			host: process.env.CORE_API_DEV_HOST || "0.0.0.0",
			port: process.env.CORE_API_DEV_PORT || 4003,
		},
		// @see https://hapijs.com/api#-serveroptionstls
		https: {
			enabled: !!process.env.CORE_API_DEV_SSL,
			host: process.env.CORE_API_DEV_SSL_HOST || "0.0.0.0",
			port: process.env.CORE_API_DEV_SSL_PORT || 8443,
			tls: {
				cert: process.env.CORE_API_DEV_SSL_CERT,
				key: process.env.CORE_API_DEV_SSL_KEY,
			},
		},
	},
};
