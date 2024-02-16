import { Commands, Services } from "@mainsail/cli";
import envPaths from "env-paths";
import { join } from "path";
import prompts from "prompts";

import { describe } from "../../test-framework";
import { CommandLineInterface } from "./cli";

describe("CLI", ({ beforeEach, it, assert, stub }) => {
	beforeEach(() => {
		process.exitCode = undefined;
		stub(Services.Updater.prototype, "check");
	});

	it("should run successfully using valid commands", async () => {
		const cli = new CommandLineInterface(["help"]);
		await assert.resolves(() => cli.execute("distribution"));
	});

	it("should fail when the dirname isn't properly configured", async () => {
		const cli = new CommandLineInterface(["help"]);
		// default dirname runs from a specific relative file location
		await assert.rejects(() => cli.execute());
	});

	it("should set exitCode = 2 when using invalid commands", async () => {
		let message: string;
		stub(console, "warn").callsFake((m: string) => (message = m));

		const cli = new CommandLineInterface(["hello"]);
		prompts.inject([false]);

		await cli.execute("distribution");
		assert.true(message.includes(`is not a mainsail-api command.`));
		assert.equal(process.exitCode, 2);
	});

	it("should set exitCode = 2 when the command doesn't have a valid signature", async () => {
		const cli = new CommandLineInterface(["--nope"]);
		await cli.execute("distribution");

		assert.equal(process.exitCode, 2);
	});

	it("should not set exitCode when a valid command appears with the help flag", async () => {
		const cli = new CommandLineInterface(["reinstall", "--help"]);

		await assert.resolves(() => cli.execute("distribution"));
		assert.undefined(process.exitCode);
	});

	it("should execute a suggested command", async () => {
		const mockExit = stub(process, "exit");

		const cli = new CommandLineInterface(["hello"]);
		prompts.inject([true]);

		await assert.resolves(() => cli.execute("distribution"));

		mockExit.neverCalled();
	});
});
