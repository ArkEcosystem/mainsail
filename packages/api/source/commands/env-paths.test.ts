/* eslint-disable unicorn/prevent-abbreviations */
import { Console, describe } from "@mainsail/test-framework";
import envPaths, { Paths } from "env-paths";

import { Command } from "./env-paths";

describe<{
	cli: Console;
}>("EnvPathsCommand", ({ beforeEach, it, stub, assert }) => {
	beforeEach((context) => {
		context.cli = new Console();
		delete process.env.CORE_PATH_CONFIG;
	});

	it("should list all system paths", async ({ cli }) => {
		let message: string;
		stub(console, "log").callsFake((m) => (message = m));

		await cli.execute(Command);

		const paths: Paths = envPaths("mainsail", { suffix: "" }); // In original code, the name is "mainsail-api", but we are using the name "mainsail" here

		assert.true(message.includes(paths.cache));
		assert.true(message.includes(paths.config));
		assert.true(message.includes(paths.data));
		assert.true(message.includes(paths.log));
		assert.true(message.includes(paths.temp));
	});
});
