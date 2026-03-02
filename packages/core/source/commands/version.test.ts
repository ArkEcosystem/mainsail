import { Console } from "@mainsail/cli";
import { describe } from "@mainsail/test-runner";

import { Command } from "./version";

describe<{
	cli: Console;
}>("VersionCommand", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
	});

	it("should log package version", async ({ cli }) => {
		const spyConsoleLog = spy(console, "log");

		await cli.execute(Command);
		spyConsoleLog.calledWith(cli.pkg.version);
	});
});
