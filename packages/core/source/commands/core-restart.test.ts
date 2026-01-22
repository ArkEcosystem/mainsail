import { Console } from "@mainsail/cli";
import { describe } from "@mainsail/test-framework";
import { Services } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";

import { Command } from "./core-restart";

describe<{
	cli: Console;
	processManager: Services.ProcessManager;
}>("CoreRestartCommand", ({ beforeEach, it, assert, stub }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.processManager = context.cli.app.get(Identifiers.Cli.Service.ProcessManager);
	});

	it("should throw if the process does not exist", async ({ cli, processManager }) => {
		const missing = stub(processManager, "missing").returnValue(true);
		const isStopped = stub(processManager, "isStopped").returnValue(false);

		await assert.rejects(() => cli.execute(Command), 'The "mainsail" process does not exist.');
	});

	it("should throw if the process is stopped", async ({ processManager, cli }) => {
		const missing = stub(processManager, "missing").returnValue(false);
		const isStopped = stub(processManager, "isStopped").returnValue(true);

		await assert.rejects(() => cli.execute(Command), 'The "mainsail" process is not running.');
	});

	it("should restart the process", async ({ processManager, cli }) => {
		const missing = stub(processManager, "missing").returnValue(false);
		const isStopped = stub(processManager, "isStopped").returnValue(false);
		const restart = stub(processManager, "restart");

		await cli.execute(Command);

		restart.calledOnce();
	});
});
