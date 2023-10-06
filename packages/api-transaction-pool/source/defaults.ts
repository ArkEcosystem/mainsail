export const defaults = {
	plugins: {
		pagination: {
			limit: 100,
		},
		socketTimeout: 5000,
		trustProxy: !!process.env.CORE_API_TRANSACTION_POOL_TRUST_PROXY,
		whitelist: ["*"],
	},
	server: {
		http: {
			enabled: !process.env.CORE_API_TRANSACTION_POOL_DISABLED,
			host: process.env.CORE_API_TRANSACTION_POOL_HOST || "0.0.0.0",
			port: process.env.CORE_API_TRANSACTION_POOL_PORT || 4007,
		},
		// @see https://hapijs.com/api#-serveroptionstls
		https: {
			enabled: !!process.env.CORE_API_TRANSACTION_POOL_SSL,
			host: process.env.CORE_API_TRANSACTION_POOL_SSL_HOST || "0.0.0.0",
			port: process.env.CORE_API_TRANSACTION_POOL_SSL_PORT || 8447,
			tls: {
				cert: process.env.CORE_API_TRANSACTION_POOL_SSL_CERT,
				key: process.env.CORE_API_TRANSACTION_POOL_SSL_KEY,
			},
		},
	},
};
