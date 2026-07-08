import { Console } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";
import { existsSync } from "fs";
import { ensureDirSync } from "fs-extra/esm";
import { join } from "path";
import prompts from "prompts";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./config-publish";

describe<{
	cli: Console;
	configDestination: string;
}>("ConfigPublishCommand", ({ beforeEach, afterAll, it, assert, stub }) => {
	beforeEach((context) => {
		process.env.MAINSAIL_PATH_CONFIG = dirSync().name;

		context.configDestination = join(process.env.MAINSAIL_PATH_CONFIG, "core");

		// The Console default flags include network=devnet, so tests run the flag path
		// unless they opt out with `new Console(false)`.
		context.cli = new Console();
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
		// Point the config source at a name that has no directory under bin/config/devnet.
		cli.app.rebind(Identifiers.Application.Name).toConstantValue("unknown");

		await assert.rejects(() => cli.execute(Command), "Couldn't find the core configuration files at");
	});

	it("should fail if the environment file cannot be found", async ({ cli }) => {
		// "." resolves the config source to bin/config/devnet itself, which exists but holds no .env file.
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

	it("should fail when no network is selected via the prompt", async ({ cli }) => {
		// Without the default flags there is no --network, which takes the prompt path; the
		// network select is commented out in the command, so this always fails after the confirm.
		const promptCli = new Console(false);

		prompts.inject([true]);

		await assert.rejects(() => promptCli.execute(Command), "You'll need to select the network to continue.");
	});

	it("should fail if the network is invalid", async ({ cli }) => {
		await assert.rejects(
			() => cli.withFlags({ network: "nonexistent" }).execute(Command),
			"Couldn't find the core configuration files at",
		);
	});

	it("should fail when the prompted network is not confirmed", async () => {
		// The confirm fatal is unreachable through the real prompt (the network select is
		// commented out, so response.network is always undefined and fatals first); stub the
		// prompt component to pin the branch anyway.
		const promptCli = new Console(false);
		stub(promptCli.app.get(Identifiers.Cli.Component.Prompt), "render").returnValue({
			confirm: false,
			network: "devnet",
		});

		await assert.rejects(() => promptCli.execute(Command), "You'll need to confirm the network to continue.");
	});
});
