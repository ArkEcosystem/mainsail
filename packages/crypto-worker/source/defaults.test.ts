import { EnvironmentVariables } from "@mainsail/constants";
import esmock from "esmock";

import { describe } from "@mainsail/test-runner";

let bust = 0;
const load = async (): Promise<{ workerCount: number | string; workerLoggingEnabled: boolean }> =>
	(await import(`./defaults.js?bust=${bust++}`)).defaults;

// Re-import defaults with os.cpus() mocked to report a specific core count.
const loadWithCpus = async (cores: number): Promise<{ workerCount: number | string }> => {
	delete process.env[EnvironmentVariables.MAINSAIL_CRYPTO_WORKER_COUNT];
	return (await esmock("./defaults", { os: { cpus: () => Array.from({ length: cores }, () => ({})) } })).defaults;
};

describe("Defaults", ({ assert, it }) => {
	it("falls back to a CPU-derived worker count and disabled logging", async () => {
		const defaults = await load();

		assert.number(defaults.workerCount);
		assert.gte(defaults.workerCount as number, 1);
		assert.lte(defaults.workerCount as number, 4);
		assert.false(defaults.workerLoggingEnabled);
	});

	it("caps the worker count at 4 on machines with more cores", async () => {
		const defaults = await loadWithCpus(16);

		assert.equal(defaults.workerCount, 4);
	});

	it("uses the cpu count when fewer than 4 cores are available", async () => {
		const defaults = await loadWithCpus(2);

		assert.equal(defaults.workerCount, 2);
	});

	it("reads the worker count and logging flag from the environment", async () => {
		process.env[EnvironmentVariables.MAINSAIL_CRYPTO_WORKER_COUNT] = "7";
		process.env[EnvironmentVariables.MAINSAIL_CRYPTO_WORKER_LOGGING_ENABLED] = "true";

		const defaults = await load();

		assert.equal(defaults.workerCount, "7");
		assert.true(defaults.workerLoggingEnabled);
	});
});
