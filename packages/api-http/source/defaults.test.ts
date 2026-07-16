import { describe } from "@mainsail/test-runner";

import { defaults } from "./defaults.js";

const ENV_KEYS = [
	"MAINSAIL_API_NO_ESTIMATED_TOTAL_COUNT",
	"MAINSAIL_API_CACHE",
	"MAINSAIL_API_LOG",
	"MAINSAIL_API_RATE_LIMIT_BLACKLIST",
	"MAINSAIL_API_RATE_LIMIT_USER_EXPIRES",
	"MAINSAIL_API_RATE_LIMIT_DISABLED",
	"MAINSAIL_API_RATE_LIMIT_USER_LIMIT",
	"MAINSAIL_API_RATE_LIMIT_WHITELIST",
	"MAINSAIL_API_TRUST_PROXY",
	"MAINSAIL_API_DISABLED",
	"MAINSAIL_API_HOST",
	"MAINSAIL_API_PORT",
	"MAINSAIL_API_SSL",
	"MAINSAIL_API_SSL_HOST",
	"MAINSAIL_API_SSL_PORT",
	"MAINSAIL_API_SSL_CERT",
	"MAINSAIL_API_SSL_KEY",
	"MAINSAIL_API_TOKENS_DEFAULT_MINIMUM_BALANCE",
];

// The module reads the environment at import time, so a fresh copy is imported
// with a cache-busting query once the environment has been prepared.
const importFresh = async (): Promise<typeof defaults> => {
	const { defaults: freshDefaults } = await import(`./defaults.js?bust=${Math.random()}`);
	return freshDefaults;
};

describe<{
	previousEnv: Record<string, string | undefined>;
}>("defaults", ({ it, beforeEach, afterEach, assert }) => {
	beforeEach((context) => {
		context.previousEnv = {};
		for (const key of ENV_KEYS) {
			context.previousEnv[key] = process.env[key];
			delete process.env[key];
		}
	});

	afterEach(({ previousEnv }) => {
		for (const key of ENV_KEYS) {
			if (previousEnv[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = previousEnv[key];
			}
		}
	});

	it("uses the documented defaults when no environment variables are set", async () => {
		const fresh = await importFresh();

		assert.true(fresh.options.estimateTotalCount);
		assert.false(fresh.plugins.cache.enabled);
		assert.false(fresh.plugins.log.enabled);
		assert.equal(fresh.plugins.pagination.limit, 100);
		assert.equal(fresh.plugins.rateLimit, {
			blacklist: [],
			duration: 60,
			enabled: true,
			points: 100,
			whitelist: [],
		});
		assert.false(fresh.plugins.trustProxy);
		assert.equal(fresh.plugins.whitelist, ["*"]);
		assert.true(fresh.server.http.enabled);
		assert.equal(fresh.server.http.host, "0.0.0.0");
		assert.equal(fresh.server.http.port, 4003);
		assert.false(fresh.server.https.enabled);
		assert.equal(fresh.server.https.port, 8443);
		assert.undefined(fresh.server.https.tls.cert);
		assert.undefined(fresh.server.https.tls.key);
		assert.equal(fresh.tokens.defaultMinimumBalance, 0.01);
	});

	it("honors the environment variable overrides", async () => {
		process.env.MAINSAIL_API_NO_ESTIMATED_TOTAL_COUNT = "true";
		process.env.MAINSAIL_API_CACHE = "true";
		process.env.MAINSAIL_API_LOG = "1";
		process.env.MAINSAIL_API_RATE_LIMIT_BLACKLIST = "1.1.1.1,2.2.2.2";
		process.env.MAINSAIL_API_RATE_LIMIT_WHITELIST = "3.3.3.3";
		process.env.MAINSAIL_API_RATE_LIMIT_DISABLED = "true";
		process.env.MAINSAIL_API_TRUST_PROXY = "true";
		process.env.MAINSAIL_API_DISABLED = "true";
		process.env.MAINSAIL_API_HOST = "127.0.0.1";
		process.env.MAINSAIL_API_SSL = "true";
		process.env.MAINSAIL_API_SSL_CERT = "/tmp/cert.pem";
		process.env.MAINSAIL_API_SSL_KEY = "/tmp/key.pem";

		const fresh = await importFresh();

		assert.false(fresh.options.estimateTotalCount);
		assert.true(fresh.plugins.cache.enabled);
		assert.true(fresh.plugins.log.enabled);
		assert.equal(fresh.plugins.rateLimit.blacklist, ["1.1.1.1", "2.2.2.2"]);
		assert.equal(fresh.plugins.rateLimit.whitelist, ["3.3.3.3"]);
		assert.false(fresh.plugins.rateLimit.enabled);
		assert.true(fresh.plugins.trustProxy);
		assert.false(fresh.server.http.enabled);
		assert.equal(fresh.server.http.host, "127.0.0.1");
		assert.true(fresh.server.https.enabled);
		assert.equal(fresh.server.https.tls.cert, "/tmp/cert.pem");
		assert.equal(fresh.server.https.tls.key, "/tmp/key.pem");
	});
});
