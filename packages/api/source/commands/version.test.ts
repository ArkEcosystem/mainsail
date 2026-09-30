import { Console } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import { Command } from "./version";

describe<{
	cli: Console;
}>("VersionCommand", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
	});

	it("should log package version", async ({ cli }) => {
		const spyOnInfo = spy(cli.app.get(Identifiers.Cli.Service.Logger), "info");

		await cli.execute(Command);

		spyOnInfo.calledWith(cli.pkg.version);
	});
});
