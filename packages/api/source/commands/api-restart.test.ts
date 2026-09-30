import { Services, Console } from "@mainsail/cli";
import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";

import { Command } from "./api-restart";

describe<{
	cli: Console;
	processManager: Services.ProcessManager;
}>("ApiRestartCommand", ({ beforeEach, it, assert, stub }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.processManager = context.cli.app.get(Identifiers.Cli.Service.ProcessManager);
	});

	it("should throw if the process does not exist", async ({ cli, processManager }) => {
		stub(processManager, "missing").returnValue(true);
		stub(processManager, "isStopped").returnValue(false);

		await assert.rejects(() => cli.execute(Command), 'The "mainsail-api" process does not exist.');
	});

	it("should throw if the process is stopped", async ({ processManager, cli }) => {
		stub(processManager, "missing").returnValue(false);
		stub(processManager, "isStopped").returnValue(true);

		await assert.rejects(() => cli.execute(Command), 'The "mainsail-api" process is not running.');
	});

	it("should restart the process", async ({ processManager, cli }) => {
		stub(processManager, "missing").returnValue(false);
		stub(processManager, "isStopped").returnValue(false);
		const restart = stub(processManager, "restart");

		await cli.execute(Command);

		restart.calledOnce();
	});
});
