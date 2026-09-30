import { describe } from "@mainsail/test-runner";

const variables = [
	"MAINSAIL_API_TRANSACTION_POOL_DISABLED",
	"MAINSAIL_API_TRANSACTION_POOL_HOST",
	"MAINSAIL_API_TRANSACTION_POOL_PORT",
	"MAINSAIL_API_TRANSACTION_POOL_RATE_LIMIT_BLACKLIST",
	"MAINSAIL_API_TRANSACTION_POOL_RATE_LIMIT_DISABLED",
	"MAINSAIL_API_TRANSACTION_POOL_RATE_LIMIT_USER_EXPIRES",
	"MAINSAIL_API_TRANSACTION_POOL_RATE_LIMIT_USER_LIMIT",
	"MAINSAIL_API_TRANSACTION_POOL_RATE_LIMIT_WHITELIST",
	"MAINSAIL_API_TRANSACTION_POOL_SSL",
	"MAINSAIL_API_TRANSACTION_POOL_SSL_CERT",
	"MAINSAIL_API_TRANSACTION_POOL_SSL_HOST",
	"MAINSAIL_API_TRANSACTION_POOL_SSL_KEY",
	"MAINSAIL_API_TRANSACTION_POOL_SSL_PORT",
	"MAINSAIL_API_TRANSACTION_POOL_TRUST_PROXY",
];

describe("Defaults", ({ it, assert, beforeEach, afterAll }) => {
	const clearVariables = () => {
		for (const variable of variables) {
			delete process.env[variable];
		}
	};

	beforeEach(clearVariables);

	// The overrides test leaves variables set; clean up so later test files are unaffected.
	afterAll(clearVariables);

	it("returns the built-in defaults when no environment variables are set", async () => {
		// The query string busts the module cache so the env-dependent top level re-evaluates.
		const { defaults } = await import("./defaults.js?clean");

		assert.equal(defaults, {
			plugins: {
				pagination: { limit: 100 },
				rateLimit: {
					blacklist: [],
					duration: 60,
					enabled: true,
					points: 150,
					whitelist: [],
				},
				socketTimeout: 5000,
				trustProxy: false,
				whitelist: ["*"],
			},
			server: {
				http: {
					enabled: true,
					host: "0.0.0.0",
					port: 4007,
				},
				https: {
					enabled: false,
					host: "0.0.0.0",
					port: 8447,
					tls: {
						cert: undefined,
						key: undefined,
					},
				},
			},
		});
	});

	it("honors the environment variable overrides", async () => {
		process.env.MAINSAIL_API_TRANSACTION_POOL_DISABLED = "true";
		process.env.MAINSAIL_API_TRANSACTION_POOL_HOST = "127.0.0.1";
		process.env.MAINSAIL_API_TRANSACTION_POOL_PORT = "4107";
		process.env.MAINSAIL_API_TRANSACTION_POOL_RATE_LIMIT_BLACKLIST = "1.1.1.1,2.2.2.2";
		process.env.MAINSAIL_API_TRANSACTION_POOL_RATE_LIMIT_DISABLED = "true";
		process.env.MAINSAIL_API_TRANSACTION_POOL_RATE_LIMIT_USER_EXPIRES = "120";
		process.env.MAINSAIL_API_TRANSACTION_POOL_RATE_LIMIT_USER_LIMIT = "300";
		process.env.MAINSAIL_API_TRANSACTION_POOL_RATE_LIMIT_WHITELIST = "3.3.3.3";
		process.env.MAINSAIL_API_TRANSACTION_POOL_SSL = "true";
		process.env.MAINSAIL_API_TRANSACTION_POOL_SSL_CERT = "/cert.pem";
		process.env.MAINSAIL_API_TRANSACTION_POOL_SSL_HOST = "10.0.0.1";
		process.env.MAINSAIL_API_TRANSACTION_POOL_SSL_KEY = "/key.pem";
		process.env.MAINSAIL_API_TRANSACTION_POOL_SSL_PORT = "8448";
		process.env.MAINSAIL_API_TRANSACTION_POOL_TRUST_PROXY = "true";

		const { defaults } = await import("./defaults.js?overridden");

		// Numeric env values stay strings here; the service provider's Joi config schema coerces them.
		assert.equal(defaults.plugins.rateLimit, {
			blacklist: ["1.1.1.1", "2.2.2.2"],
			duration: "120",
			enabled: false,
			points: "300",
			whitelist: ["3.3.3.3"],
		});
		assert.true(defaults.plugins.trustProxy);
		assert.equal(defaults.server.http, {
			enabled: false,
			host: "127.0.0.1",
			port: "4107",
		});
		assert.equal(defaults.server.https, {
			enabled: true,
			host: "10.0.0.1",
			port: "8448",
			tls: {
				cert: "/cert.pem",
				key: "/key.pem",
			},
		});
	});
});
