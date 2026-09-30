import { Console, Utils } from "@mainsail/cli";
import { describe } from "@mainsail/test-runner";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./api-run";

describe<{
	cli: Console;
}>("ApiRunCommand", ({ beforeEach, afterAll, it, stub, assert }) => {
	beforeEach((context) => {
		process.env.MAINSAIL_PATH_CONFIG = dirSync().name;

		context.cli = new Console();
	});

	afterAll(() => setGracefulCleanup());

	it("should build the application with the api flags", async ({ cli }) => {
		let buildOptions: any;
		const buildCalled = new Promise<void>((resolve) => {
			stub(Utils.Builder, "buildApplication").callsFake(async (options) => {
				buildOptions = options;
				resolve();
			});
		});

		// api:run never resolves by design (it keeps the process in the foreground),
		// so the execution promise is intentionally not awaited.
		cli.execute(Command);

		await buildCalled;

		assert.equal(buildOptions.flags.name, "api");
		assert.true(buildOptions.flags.allowMissingConfigFiles);
		assert.equal(buildOptions.flags.env, "production");
		assert.false(buildOptions.flags.skipPrompts);
	});

	it("should build the application with the [--env] and [--skipPrompts] flags", async ({ cli }) => {
		let buildOptions: any;
		const buildCalled = new Promise<void>((resolve) => {
			stub(Utils.Builder, "buildApplication").callsFake(async (options) => {
				buildOptions = options;
				resolve();
			});
		});

		// api:run never resolves by design (it keeps the process in the foreground),
		// so the execution promise is intentionally not awaited.
		cli.withFlags({ env: "test", skipPrompts: true }).execute(Command);

		await buildCalled;

		assert.equal(buildOptions.flags.env, "test");
		assert.true(buildOptions.flags.skipPrompts);
	});
});
