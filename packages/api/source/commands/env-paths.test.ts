/* eslint-disable unicorn/prevent-abbreviations */
import { Console } from "@mainsail/cli";
import { describe } from "@mainsail/test-runner";
import envPaths, { Paths } from "env-paths";
import { join } from "path";

import { apiPackageJson } from "../test/fixtures";
import { Command } from "./env-paths";

describe<{
	cli: Console;
}>("EnvPathsCommand", ({ beforeEach, it, stub, assert }) => {
	beforeEach((context) => {
		context.cli = new Console(true, apiPackageJson);
		delete process.env.MAINSAIL_PATH_CONFIG;
	});

	it("should list all system paths", async ({ cli }) => {
		let message: string;
		stub(console, "log").callsFake((m) => (message = m));

		await cli.execute(Command);

		// Paths are <envPaths("mainsail")>/<app name>, where the app name is the
		// package name after the scope ("@mainsail/api" -> "api").
		const paths: Paths = envPaths("mainsail", { suffix: "" });

		assert.true(message.includes(join(paths.cache, "api")));
		assert.true(message.includes(join(paths.config, "api")));
		assert.true(message.includes(join(paths.data, "api")));
		assert.true(message.includes(join(paths.log, "api")));
		assert.true(message.includes(join(paths.temp, "api")));
	});
});
