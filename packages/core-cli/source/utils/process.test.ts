import Tail from "nodejs-tail";
import { fileSync, setGracefulCleanup } from "tmp";

import { Console, describe } from "../../../core-test-framework";
import { Identifiers, interfaces } from "../ioc";
import { ProcessManager } from "../services";
import { Process } from "./process";

describe<{
	cli: Console;
	processManager: ProcessManager;
	process: Process;
}>("Process", ({ beforeEach, afterAll, it, assert, stub, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.processManager = context.cli.app.get(Identifiers.ProcessManager);

		context.cli.app
			.rebind(Identifiers.ProcessFactory)
			.toFactory((context: interfaces.Context) => (token: string, type: string): Process => {
				const process: Process = context.container.resolve(Process);
				process.initialize(token, type);

				return process;
			});

		context.process = context.cli.app.get(Identifiers.ProcessFactory)("ark", "core");
	});

	afterAll(() => setGracefulCleanup());

	it("#stop - should throw if the process does not exist", ({ process, processManager }) => {
		stub(processManager, "missing").returnValue(true);
		stub(processManager, "isUnknown").returnValue(false);
		stub(processManager, "isStopped").returnValue(false);

		assert.throws(() => process.stop(false), 'The "ark-core" process does not exist.');
	});

	it("#stop - should throw if the process entered an unknown state", ({ process, processManager }) => {
		stub(processManager, "missing").returnValue(false);
		stub(processManager, "isUnknown").returnValue(true);
		stub(processManager, "isStopped").returnValue(false);

		assert.throws(() => process.stop(false), 'The "ark-core" process has entered an unknown state.');
	});

	it("#stop - should throw if the process is stopped", ({ process, processManager }) => {
		stub(processManager, "missing").returnValue(false);
		stub(processManager, "isUnknown").returnValue(false);
		stub(processManager, "isStopped").returnValue(true);

		assert.throws(() => process.stop(false), 'The "ark-core" process is not running.');
	});

	it("#stop - should delete the process if the [--daemon] flag is not present", ({ process, processManager }) => {
		stub(processManager, "missing").returnValue(false);
		stub(processManager, "isUnknown").returnValue(false);
		stub(processManager, "isStopped").returnValue(false);
		const deleteSpy = stub(processManager, "delete");

		process.stop(true);

		deleteSpy.calledOnce();
	});

	it("#stop - should stop the process if the [--daemon] flag is present", ({ process, processManager }) => {
		stub(processManager, "missing").returnValue(false);
		stub(processManager, "isUnknown").returnValue(false);
		stub(processManager, "isStopped").returnValue(false);
		const stopSpy = stub(processManager, "stop");

		process.stop(false);

		stopSpy.calledOnce();
	});

	it("#restart - should throw if the process does not exist", ({ process, processManager }) => {
		stub(processManager, "missing").returnValue(true);
		stub(processManager, "isStopped").returnValue(false);

		assert.throws(() => process.restart(), 'The "ark-core" process does not exist.');
	});

	it("#restart - should throw if the process is stopped", ({ process, processManager }) => {
		stub(processManager, "missing").returnValue(false);
		stub(processManager, "isStopped").returnValue(true);

		assert.throws(() => process.restart(), 'The "ark-core" process is not running.');
	});

	it("#restart - should restart the process", ({ process, processManager }) => {
		stub(processManager, "missing").returnValue(false);
		stub(processManager, "isStopped").returnValue(false);
		const restartSpy = stub(processManager, "restart");

		process.restart();

		restartSpy.calledOnce();
	});

	it("#status - should throw if the process does not exist", async ({ process }) => {
		assert.throws(() => process.status(), 'The "ark-core" process does not exist.');
	});

	it("#status - should render a table with the process information", async ({ process, processManager }) => {
		stub(processManager, "missing").returnValue(false);
		stub(processManager, "describe").returnValue({
			monit: { cpu: 2, memory: 2048 },
			name: "ark-core",
			pid: 1,
			pm2_env: {
				pm_uptime: 1_387_045_673_686,
				status: "online",
				version: "1.0.0",
			},
		});

		let message: string;
		stub(console, "log").callsFake((m) => (message = m));

		process.status();

		assert.true(
			["ID", "Name", "Version", "Status", "Uptime", "CPU", "RAM"].every((column) => message.includes(column)),
		);

		assert.true(
			[
				"1",
				"ark-core",
				"1.0.0",
				"online",
				// "5y 267d 19h 31m 28.1s",
				"2%",
				"2.05 kB",
			].every((value) => message.includes(value)),
		);
	});

	it("#log - should throw if the process does not exist", async ({ process }) => {
		await assert.rejects(() => process.log(false, 1), 'The "ark-core" process does not exist.');
	});

	it("#log - should log to pm_out_log_path", async ({ cli, process, processManager }) => {
		stub(cli.app.get(Identifiers.AbortMissingProcess), "execute");
		stub(processManager, "describe").returnValue({
			monit: { cpu: 2, memory: 2048 },
			name: "ark-core",
			pid: 1,
			pm2_env: {
				pm_err_log_path: fileSync().name,
				pm_out_log_path: fileSync().name,
				pm_uptime: 1_387_045_673_686,
				status: "online",
				version: "1.0.0",
			},
		});
		const spyWatch = stub(Tail.prototype, "watch");
		const spyLog = spy(console, "log");

		await process.log(false, 15);

		spyWatch.calledOnce();
		spyLog.calledWith("Tailing last 15 lines for [ark-core] process (change the value with --lines option)");
	});

	it("#log - should log to pm_err_log_path", async ({ cli, process, processManager }) => {
		stub(cli.app.get(Identifiers.AbortMissingProcess), "execute");
		stub(processManager, "describe").returnValue({
			monit: { cpu: 2, memory: 2048 },
			name: "ark-core",
			pid: 1,
			pm2_env: {
				pm_err_log_path: fileSync().name,
				pm_out_log_path: fileSync().name,
				pm_uptime: 1_387_045_673_686,
				status: "online",
				version: "1.0.0",
			},
		});
		const spyWatch = stub(Tail.prototype, "watch");
		const spyLog = spy(console, "log");

		await process.log(true, 15);

		spyWatch.calledOnce();
		spyLog.calledWith("Tailing last 15 lines for [ark-core] process (change the value with --lines option)");
	});
});
