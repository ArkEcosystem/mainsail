import { ensureDirSync } from "fs-extra";
import prompts from "prompts";
import { dirSync, setGracefulCleanup } from "tmp";

import { Console, describe } from "../../../core-test-framework";
import { DiscoverNetwork } from "./discover-network";

describe<{
	cmd: DiscoverNetwork;
	configPath: string;
}>("DiscoverNetwork", ({ beforeEach, afterAll, it, assert }) => {
	beforeEach((context) => {
		const cli = new Console();

		context.cmd = cli.app.resolve(DiscoverNetwork);

		context.configPath = dirSync().name;
	});

	afterAll(() => setGracefulCleanup());

	it("should throw if no configurations can be detected", async ({ cmd, configPath }) => {
		await assert.rejects(() => cmd.discover(configPath));
	});

	it("should choose the first network if only a single network is found", async ({ cmd, configPath }) => {
		ensureDirSync(`${configPath}/mainnet`);

		assert.equal(await cmd.discover(configPath), "mainnet");
	});

	it("should throw if the given path does not exist", async ({ cmd }) => {
		await assert.rejects(() => cmd.discover("does-not-exist"), "The [does-not-exist] directory does not exist.");
	});

	it("should choose the selected network if multiple networks are found", async ({ cmd, configPath }) => {
		ensureDirSync(`${configPath}/mainnet`);
		ensureDirSync(`${configPath}/devnet`);

		prompts.inject(["devnet", true]);

		assert.equal(await cmd.discover(configPath), "devnet");
	});

	it("should throw if multiple networks are found && skipPrompts = false", async ({ cmd, configPath }) => {
		ensureDirSync(`${configPath}/mainnet`);
		ensureDirSync(`${configPath}/devnet`);

		await assert.rejects(
			() => cmd.discover(configPath, false),
			`Cannot determine network from directory [${configPath}]`,
		);
	});

	it("should throw if the network selection is not confirmed", async ({ cmd, configPath }) => {
		ensureDirSync(`${configPath}/mainnet`);
		ensureDirSync(`${configPath}/devnet`);

		prompts.inject(["devnet", false]);

		await assert.rejects(() => cmd.discover(configPath), "You'll need to confirm the network to continue.");
	});

	it("should throw if the network selection is not valid", async ({ cmd, configPath }) => {
		ensureDirSync(`${configPath}/mainnet`);
		ensureDirSync(`${configPath}/devnet`);

		prompts.inject(["randomnet", true]);

		await assert.rejects(() => cmd.discover(configPath), `The given network "randomnet" is not valid.`);
	});
});
