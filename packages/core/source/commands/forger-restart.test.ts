import { Container, Services } from "@arkecosystem/core-cli";
import { Console, describe } from "@arkecosystem/core-test-framework";
import { Command } from "./forger-restart";

let cli;
let processManager;

describe<{
	cli: Console;
	processManager: Services.ProcessManager;
}>("ForgerRestartCommand", ({ beforeEach, it, stub, assert }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.processManager = context.cli.app.get(Container.Identifiers.ProcessManager);
	});

	it("should throw if the process does not exist", async ({ cli, processManager }) => {
		const missing = stub(processManager, "missing").returnValue(true);
		const isStopped = stub(processManager, "isStopped").returnValue(false);

		await assert.rejects(() => cli.execute(Command), 'The "ark-forger" process does not exist.');
	});

	it("should throw if the process is stopped", async ({ cli, processManager }) => {
		const missing = stub(processManager, "missing").returnValue(false);
		const isStopped = stub(processManager, "isStopped").returnValue(true);

		await assert.rejects(() => cli.execute(Command), 'The "ark-forger" process is not running.');
	});

	it("should restart the process", async ({ processManager, cli }) => {
		const missing = stub(processManager, "missing").returnValue(false);
		const isStopped = stub(processManager, "isStopped").returnValue(false);
		const restart = stub(processManager, "restart");

		await cli.execute(Command);

		restart.calledOnce();
	});
});
