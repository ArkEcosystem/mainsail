import { Identifiers, Services } from "@mainsail/cli";
import { Console, describe } from "@mainsail/test-framework";

import { Command } from "./top";

describe<{
	cli: Console;
	processManager: Services.ProcessManager;
}>("TopCommand", ({ beforeEach, it, stub, assert }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.processManager = context.cli.app.get(Identifiers.ProcessManager);
	});

	it("should render a table with process information", async ({ processManager, cli }) => {
		stub(processManager, "list").returnValue([
			{
				monit: { cpu: 2, memory: 2048 },
				name: "mainsail-api",
				pid: 1,
				pm2_env: {
					pm_uptime: 1_387_045_673_686,
					status: "online",
					version: "1.0.0",
				},
			},
			{
				monit: { cpu: 2, memory: 2048 },
				name: "mainsail",
				pid: 2,
				pm2_env: {
					pm_uptime: 1_387_045_673_686,
					status: "online",
					version: "1.0.0",
				},
			},
		]);

		let message: string;
		stub(console, "log").callsFake((m) => (message = m));

		await cli.execute(Command);

		assert.true(
			["ID", "Name", "Version", "Status", "Uptime", "CPU", "RAM"].every((column) => message.includes(column)),
		);
		assert.true(
			[
				"1",
				"mainsail-api",
				"1.0.0",
				"online",
				// "5y 267d 19h 31m 28.1s",
				"2%",
				"2.05 kB",
			].every((column) => message.includes(column)),
		);
	});

	it("should throw if no processes are running", async ({ processManager, cli }) => {
		stub(processManager, "list").returnValue([]);

		await assert.rejects(() => cli.execute(Command), "No processes are running.");
	});

	it("should throw if the process list is undefined", async ({ processManager, cli }) => {
		stub(processManager, "list");

		await assert.rejects(() => cli.execute(Command), "No processes are running.");
	});
});
