import { Container, Services } from "@arkecosystem/core-cli";
import { Console, describe } from "@arkecosystem/core-test-framework";

import { Command } from "./relay-restart";

describe<{
	cli: Console;
	processManager: Services.ProcessManager;
}>("RelayRestartCommand", ({ beforeEach, it, stub, assert }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.processManager = context.cli.app.get(Container.Identifiers.ProcessManager);
	});

	it("should throw if the process does not exist", async ({ processManager, cli }) => {
		stub(processManager, "missing").returnValue(true);
		stub(processManager, "isStopped").returnValue(false);

		await assert.rejects(() => cli.execute(Command), 'The "ark-relay" process does not exist.');
	});

	it("should throw if the process is stopped", async ({ processManager, cli }) => {
		stub(processManager, "missing").returnValue(false);
		stub(processManager, "isStopped").returnValue(true);

		await assert.rejects(() => cli.execute(Command), 'The "ark-relay" process is not running.');
	});

	it("should restart the process", async ({ processManager, cli }) => {
		stub(processManager, "missing").returnValue(false);
		stub(processManager, "isStopped").returnValue(false);
		const restart = stub(processManager, "restart");

		await cli.execute(Command);

		restart.calledOnce();
	});
});
