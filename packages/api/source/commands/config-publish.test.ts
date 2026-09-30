import { Console } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";
import { existsSync } from "fs";
import { ensureDirSync } from "fs-extra";
import { join } from "path";
import { dirSync, setGracefulCleanup } from "tmp";

import { apiPackageJson } from "../../test/fixtures";
import { Command } from "./config-publish";

describe<{
	cli: Console;
	configDestination: string;
}>("ConfigPublishCommand", ({ beforeEach, afterAll, it, assert }) => {
	beforeEach((context) => {
		process.env.MAINSAIL_PATH_CONFIG = dirSync().name;

		context.configDestination = join(process.env.MAINSAIL_PATH_CONFIG, "api");

		context.cli = new Console(true, apiPackageJson);
	});

	afterAll(() => setGracefulCleanup());

	it("should fail if the destination already exists", async ({ cli, configDestination }) => {
		ensureDirSync(configDestination);

		await assert.rejects(
			() => cli.execute(Command),
			"Please use the --reset flag if you wish to reset your configuration.",
		);
	});

	it("should fail if the core configuration files cannot be found", async ({ cli }) => {
		// Point the config source at a name that has no directory under bin/config.
		cli.app.rebind(Identifiers.Application.Name).toConstantValue("unknown");

		await assert.rejects(() => cli.execute(Command), "Couldn't find the api configuration files at");
	});

	it("should fail if the environment file cannot be found", async ({ cli }) => {
		// "." resolves the config source to bin/config itself, which exists but holds no .env file.
		cli.app.rebind(Identifiers.Application.Name).toConstantValue(".");

		await assert.rejects(() => cli.execute(Command), "Couldn't find the environment file at");
	});

	it("should publish the configuration", async ({ cli, configDestination }) => {
		await cli.execute(Command);

		assert.true(existsSync(join(configDestination, ".env")));
		assert.true(existsSync(join(configDestination, "app.json")));
	});

	it("should overwrite the existing configuration with the reset flag", async ({ cli, configDestination }) => {
		await cli.execute(Command);

		await assert.rejects(
			() => cli.execute(Command),
			"Please use the --reset flag if you wish to reset your configuration.",
		);

		await cli.withFlags({ reset: true }).execute(Command);

		assert.true(existsSync(join(configDestination, ".env")));
		assert.true(existsSync(join(configDestination, "app.json")));
	});
});
