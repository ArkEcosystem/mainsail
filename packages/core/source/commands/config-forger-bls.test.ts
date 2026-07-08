import { ensureDirSync, readJSONSync, writeJSONSync } from "fs-extra/esm";
import prompts from "prompts";
import { dirSync, setGracefulCleanup } from "tmp";

import { Console } from "@mainsail/cli";
import { describe } from "@mainsail/test-runner";
import { Command } from "./config-forger-bls";

describe<{
	cli: Console;
}>("ConfigForgerBlsCommand", ({ beforeEach, afterAll, it, assert }) => {
	const privateKey = "a".repeat(64);

	const validatorsPath = () => `${process.env.MAINSAIL_PATH_CONFIG}/core/validators.json`;

	beforeEach((context) => {
		process.env.MAINSAIL_PATH_CONFIG = dirSync().name;

		ensureDirSync(`${process.env.MAINSAIL_PATH_CONFIG}/core/`);
		writeJSONSync(validatorsPath(), {});

		context.cli = new Console();
	});

	afterAll(() => setGracefulCleanup());

	it("should configure from flags", async ({ cli }) => {
		await cli.withFlags({ privateKey }).execute(Command);

		assert.equal(readJSONSync(validatorsPath()).secrets, [privateKey]);
	});

	it("should configure from a prompt if it receives a valid key and confirmation", async ({ cli }) => {
		prompts.inject([privateKey, true]);

		await cli.execute(Command);

		assert.equal(readJSONSync(validatorsPath()).secrets, [privateKey]);
	});

	it("should not write the configuration when the prompt is not confirmed", async ({ cli }) => {
		prompts.inject([privateKey, false]);

		await assert.resolves(() => cli.execute(Command));

		assert.equal(readJSONSync(validatorsPath()), {});
	});

	it("should fail to configure from flags if the key is not BLS12-381 compliant", async ({ cli }) => {
		await assert.rejects(
			() => cli.withFlags({ privateKey: "invalid" }).execute(Command),
			"Failed to verify the given key as BLS12-381 compliant.",
		);

		assert.equal(readJSONSync(validatorsPath()), {});
	});

	it("should fail to configure from a prompt if the key is not BLS12-381 compliant", async ({ cli }) => {
		// Injected values bypass the prompt validator, so the task-level validation has to catch it.
		prompts.inject(["invalid", true]);

		await assert.rejects(() => cli.execute(Command), "Failed to verify the given key as BLS12-381 compliant.");

		assert.equal(readJSONSync(validatorsPath()), {});
	});
});
