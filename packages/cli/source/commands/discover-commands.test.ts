import { resolve } from "path";
import { setGracefulCleanup } from "tmp";

import { Console, describe } from "../../../test-framework/source";
import { DiscoverCommands } from "./discover-commands";

describe<{ DiscoverCommands; cmd: DiscoverCommands }>("DiscoverCommands", ({ beforeEach, afterAll, it, assert }) => {
	beforeEach((context) => {
		const cli = new Console();

		context.cmd = cli.app.resolve(DiscoverCommands);
	});

	afterAll(() => {
		setGracefulCleanup();
	});

	it("#within - should discover commands within the given directory", async ({ cmd }) => {
		const commandPath: string = resolve("../core/distribution/commands");

		const commands = await cmd.within(commandPath);
		assert.object(commands);
		assert.gt(Object.keys(commands).length, 0);
	});

	it("#from - should not discover commands if no packages are passed in", ({ cmd }) => {
		const commands = cmd.from([]);

		assert.object(commands);
		assert.equal(Object.keys(commands).length, 0);
	});

	it("#from - should not discover commands if package path is invalid", ({ cmd }) => {
		const commands = cmd.from(["dummy/path"]);

		assert.object(commands);
		assert.equal(Object.keys(commands).length, 0);
	});

	// TODO: Fix this test, prepare hidden.js & visible.js as ESM packages
	it.skip("#from - should discover commands within the given packages", async ({ cmd }) => {
		const commandPath: string = resolve(import.meta.dirname, "../../test", "./pkg_distribution");

		console.log(commandPath);

		const commands = await cmd.from([commandPath]);

		console.log(commands);

		assert.object(commands);
		assert.true(Object.keys(commands).includes("help"));
	});
});
