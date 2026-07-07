import { Commands, Services } from "@mainsail/cli";
import prompts from "prompts";

import { describe } from "@mainsail/test-runner";
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

	it("should set NODE_PATH when it is not set", async () => {
		delete process.env.NODE_PATH;

		const cli = new CommandLineInterface(["help"]);

		await assert.resolves(() => cli.execute("distribution"));
		assert.string(process.env.NODE_PATH);
	});

	it("should execute a command discovered from plugins", async () => {
		let executed = false;
		stub(Commands.DiscoverCommands.prototype, "from").resolvedValue({
			"plugin:test": {
				register: () => {},
				run: async () => {
					executed = true;
				},
			},
		});

		const cli = new CommandLineInterface(["plugin:test"]);

		await assert.resolves(() => cli.execute("distribution"));
		assert.true(executed);
	});
});
