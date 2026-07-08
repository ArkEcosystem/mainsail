import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import prompts from "prompts";
import { dirSync, setGracefulCleanup } from "tmp";

import { Console } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";
import { Command } from "./pool-clear";

describe<{
	cli: Console;
	poolPath: string;
	getCorePath: any;
}>("PoolClearCommand", ({ beforeEach, afterAll, it, assert, stub }) => {
	// The command removes a real directory (fs-extra/esm's removeSync cannot be stubbed
	// from here — module-identity mismatch is what got the previous tests skipped), so
	// each test works on a real transaction-pool directory inside a tmp dir.
	beforeEach((context) => {
		const dataPath = dirSync().name;
		context.poolPath = join(dataPath, "transaction-pool");
		mkdirSync(context.poolPath, { recursive: true });
		writeFileSync(join(context.poolPath, "wal.db"), "data");

		context.cli = new Console();
		context.getCorePath = stub(context.cli.app, "getCorePath").returnValue(context.poolPath);
	});

	afterAll(() => setGracefulCleanup());

	it("should clear the pool after prompt confirmation", async ({ cli, poolPath }) => {
		prompts.inject([true]);

		await assert.resolves(() => cli.execute(Command));

		assert.false(existsSync(poolPath));
	});

	it("should do nothing when the prompt confirmation is declined", async ({ cli, poolPath }) => {
		prompts.inject([false]);

		await assert.resolves(() => cli.execute(Command));

		assert.true(existsSync(poolPath));
	});

	it("should report errors while clearing", async ({ cli, getCorePath }) => {
		getCorePath.callsFake(() => {
			throw new Error("Fake Error");
		});

		prompts.inject([true]);

		await assert.rejects(() => cli.execute(Command), "Fake Error");
	});

	it("should clear the pool without confirmation when the [--force] flag is present", async ({ cli, poolPath }) => {
		// Stub confirm (declining) instead of injecting a prompt: an unconsumed injection
		// would leak into other test files via prompts' global queue, and a stub lets us
		// assert the prompt is skipped entirely.
		const confirm = stub(cli.app.get(Identifiers.Cli.Component.Factory), "confirm").resolvedValue(false);

		await assert.resolves(() => cli.withFlags({ force: true }).execute(Command));

		assert.false(existsSync(poolPath));
		confirm.neverCalled();
	});
});
