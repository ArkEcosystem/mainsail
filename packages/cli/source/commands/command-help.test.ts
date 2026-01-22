import { setGracefulCleanup } from "tmp";

import { describe } from "@mainsail/test-runner";
import { Command, CommandWithoutDefinition } from "../../test/stubs";
import { CommandHelp } from "./command-help";
import { Console } from "../test/index.ts";

describe<{
	cli: Console;
	cmd: CommandHelp;
}>("CommandHelp", ({ beforeEach, afterAll, it, assert }) => {
	beforeEach((context) => {
		context.cli = new Console();

		context.cmd = context.cli.app.resolve(CommandHelp);
	});

	afterAll(() => setGracefulCleanup());

	it("should render the help if a command has arguments and flags", ({ cmd, cli }) => {
		assert.string(cmd.render(cli.app.resolve(Command)));
	});

	it("should render the help if a command does not have arguments or flags", ({ cmd, cli }) => {
		assert.string(cmd.render(cli.app.resolve(CommandWithoutDefinition)));
	});
});
