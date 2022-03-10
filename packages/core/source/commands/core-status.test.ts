import { Container, Services } from "@arkecosystem/core-cli";
import { Console, describe } from "@arkecosystem/core-test-framework";

import { Command } from "./core-status";

describe<{
	cli: Console;
	processManager: Services.ProcessManager;
}>("CoreStatusCommand", ({ beforeEach, it, assert, stub }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.processManager = context.cli.app.get(Container.Identifiers.ProcessManager);
	});

	it("should throw if the process does not exist", async ({ cli }) => {
		await assert.rejects(() => cli.execute(Command), 'The "ark-core" process does not exist.');
	});

	it("should render a table with the process information", async ({ processManager, cli }) => {
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

		await cli.execute(Command);

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
			].every((column) => message.includes(column)),
		);
	});
});
