import { EnvironmentVariables } from "@mainsail/constants";

import { describe } from "@mainsail/test-runner";

let bust = 0;
const load = async (): Promise<{ workerCount: number | string; workerLoggingEnabled: boolean }> =>
	(await import(`./defaults.js?bust=${bust++}`)).defaults;

describe<{
	count: string | undefined;
	logging: string | undefined;
}>("Defaults", ({ assert, beforeEach, afterEach, it }) => {
	beforeEach((context) => {
		context.count = process.env[EnvironmentVariables.MAINSAIL_CRYPTO_WORKER_COUNT];
		context.logging = process.env[EnvironmentVariables.MAINSAIL_CRYPTO_WORKER_LOGGING_ENABLED];
		delete process.env[EnvironmentVariables.MAINSAIL_CRYPTO_WORKER_COUNT];
		delete process.env[EnvironmentVariables.MAINSAIL_CRYPTO_WORKER_LOGGING_ENABLED];
	});

	afterEach((context) => {
		process.env[EnvironmentVariables.MAINSAIL_CRYPTO_WORKER_COUNT] = context.count;
		process.env[EnvironmentVariables.MAINSAIL_CRYPTO_WORKER_LOGGING_ENABLED] = context.logging;
		if (context.count === undefined) {
			delete process.env[EnvironmentVariables.MAINSAIL_CRYPTO_WORKER_COUNT];
		}
		if (context.logging === undefined) {
			delete process.env[EnvironmentVariables.MAINSAIL_CRYPTO_WORKER_LOGGING_ENABLED];
		}
	});

	it("falls back to a CPU-derived worker count and disabled logging", async () => {
		const defaults = await load();

		assert.number(defaults.workerCount);
		assert.gte(defaults.workerCount as number, 1);
		assert.lte(defaults.workerCount as number, 4);
		assert.false(defaults.workerLoggingEnabled);
	});

	it("reads the worker count and logging flag from the environment", async () => {
		process.env[EnvironmentVariables.MAINSAIL_CRYPTO_WORKER_COUNT] = "7";
		process.env[EnvironmentVariables.MAINSAIL_CRYPTO_WORKER_LOGGING_ENABLED] = "true";

		const defaults = await load();

		assert.equal(defaults.workerCount, "7");
		assert.true(defaults.workerLoggingEnabled);
	});
});
