import { Container, Services } from "@arkecosystem/core-cli";
import { Console, describe } from "@arkecosystem/core-test-framework";
import { Command } from "./relay-stop";

describe<{
	cli: Console;
	processManager: Services.ProcessManager;
}>("RelayStopCommand", ({ beforeEach, it, assert, stub }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.processManager = context.cli.app.get(Container.Identifiers.ProcessManager);
	});

	it("should throw if the process does not exist", async ({ processManager, cli }) => {
		stub(processManager, "missing").returnValue(true);
		stub(processManager, "isUnknown").returnValue(false);
		stub(processManager, "isStopped").returnValue(false);

		await assert.rejects(() => cli.execute(Command), 'The "ark-relay" process does not exist.');
	});

	it("should throw if the process entered an unknown state", async ({ processManager, cli }) => {
		stub(processManager, "missing").returnValue(false);
		stub(processManager, "isUnknown").returnValue(true);
		stub(processManager, "isStopped").returnValue(false);

		await assert.rejects(() => cli.execute(Command), 'The "ark-relay" process has entered an unknown state.');
	});

	it("should throw if the process is stopped", async ({ processManager, cli }) => {
		stub(processManager, "missing").returnValue(false);
		stub(processManager, "isUnknown").returnValue(false);
		stub(processManager, "isStopped").returnValue(true);

		await assert.rejects(() => cli.execute(Command), 'The "ark-relay" process is not running.');
	});

	it("should stop the process if the [--daemon] flag is not present", async ({ processManager, cli }) => {
		stub(processManager, "missing").returnValue(false);
		stub(processManager, "isUnknown").returnValue(false);
		stub(processManager, "isStopped").returnValue(false);
		const deleteSpy = stub(processManager, "delete");

		await cli.withFlags({ daemon: true }).execute(Command);

		deleteSpy.calledOnce();
	});

	it("should delete the process if the [--daemon] flag is present", async ({ processManager, cli }) => {
		stub(processManager, "missing").returnValue(false);
		stub(processManager, "isUnknown").returnValue(false);
		stub(processManager, "isStopped").returnValue(false);
		const stop = stub(processManager, "stop");

		await cli.execute(Command);

		stop.calledOnce();
	});
});
