import { describe } from "@mainsail/test-runner";

import { defaults } from "./defaults.js";

const ENV_KEYS = [
	"MAINSAIL_API_SYNC_ENABLED",
	"MAINSAIL_API_SYNC_INTERVAL",
	"MAINSAIL_API_SYNC_TOKEN_CACHE_SIZE",
	"MAINSAIL_API_SYNC_TOKEN_WHITELIST_SYNC_INTERVAL",
	"MAINSAIL_API_SYNC_TOKEN_WHITELIST_REMOTE_URL",
	"MAINSAIL_API_SYNC_RESTORE_BLOCKS_BATCH_SIZE",
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

		assert.false(fresh.enabled);
		assert.equal(fresh.restore.blocks.batchSize, 1000);
		assert.equal(fresh.syncInterval, 8000);
		assert.equal(fresh.tokenCacheSize, 256);
		assert.equal(fresh.tokenWhitelistRefreshInterval, 60_000);
		assert.equal(fresh.tokenWhitelistRemoteUrl, "");
	});

	it("honors the environment variable overrides", async () => {
		process.env.MAINSAIL_API_SYNC_ENABLED = "true";
		process.env.MAINSAIL_API_SYNC_INTERVAL = "5000";
		process.env.MAINSAIL_API_SYNC_TOKEN_CACHE_SIZE = "16";
		process.env.MAINSAIL_API_SYNC_TOKEN_WHITELIST_SYNC_INTERVAL = "30000";
		process.env.MAINSAIL_API_SYNC_TOKEN_WHITELIST_REMOTE_URL = "https://tokens.example.org/whitelist.json";
		process.env.MAINSAIL_API_SYNC_RESTORE_BLOCKS_BATCH_SIZE = "50";

		const fresh = await importFresh();

		assert.true(fresh.enabled);
		assert.equal(fresh.restore.blocks.batchSize, "50");
		assert.equal(fresh.syncInterval, "5000");
		assert.equal(fresh.tokenCacheSize, "16");
		assert.equal(fresh.tokenWhitelistRefreshInterval, "30000");
		assert.equal(fresh.tokenWhitelistRemoteUrl, "https://tokens.example.org/whitelist.json");
	});

	it("treats '1' as enabled", async () => {
		process.env.MAINSAIL_API_SYNC_ENABLED = "1";

		const fresh = await importFresh();

		assert.true(fresh.enabled);
	});

	it("treats any other value as disabled", async () => {
		process.env.MAINSAIL_API_SYNC_ENABLED = "yes";

		const fresh = await importFresh();

		assert.false(fresh.enabled);
	});
});
