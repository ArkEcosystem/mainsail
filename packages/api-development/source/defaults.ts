export const defaults = {
	plugins: {
		pagination: {
			limit: 100,
		},
		rateLimit: {
			blacklist: process.env.CORE_API_DEV_RATE_LIMIT_BLACKLIST
				? process.env.CORE_API_DEV_RATE_LIMIT_BLACKLIST.split(",")
				: [],
			duration: process.env.CORE_API_DEV_RATE_LIMIT_USER_EXPIRES || 60, // Sec
			enabled: !process.env.CORE_API_DEV_RATE_LIMIT_DISABLED,
			points: process.env.CORE_API_DEV_RATE_LIMIT_USER_LIMIT || 100,

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
			enabled: !!process.env.CORE_API_DEV_ENABLED,
			host: process.env.CORE_API_DEV_HOST || "127.0.0.1",
			port: process.env.CORE_API_DEV_PORT || 4006,
		},
		// @see https://hapijs.com/api#-serveroptionstls
		https: {
			enabled: !!process.env.CORE_API_DEV_SSL,
			host: process.env.CORE_API_DEV_SSL_HOST || "127.0.0.1",
			port: process.env.CORE_API_DEV_SSL_PORT || 8446,
			tls: {
				cert: process.env.CORE_API_DEV_SSL_CERT,
				key: process.env.CORE_API_DEV_SSL_KEY,
			},
		},
	},
};
