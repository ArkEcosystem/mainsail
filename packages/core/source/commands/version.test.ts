import { Console, describe } from "@arkecosystem/core-test-framework";

import { Command } from "./version";

describe<{
	cli: Console;
}>("VersionCommand", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
	});

	it("should log package version", async ({ cli }) => {
		const spyConsoleLog = spy(console, "log");

		await cli.execute(Command);
		spyConsoleLog.calledWith(cli.pkg.version);
	});
});
