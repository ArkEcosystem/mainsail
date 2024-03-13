import { Console, describe } from "../../../test-framework/source";

import { Command } from "./uninstall";

describe<{
	cli: Console;
}>("UninstallCommand", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.cli = new Console();
	});

	it("should throw since the command is not implemented", async ({ cli }) => {
		await assert.rejects(() => cli.execute(Command), "This command has not been implemented.");
	});
});
