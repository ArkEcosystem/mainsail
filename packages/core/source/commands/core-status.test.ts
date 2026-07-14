import { Console } from "@mainsail/cli";
import { describe } from "@mainsail/test-runner";
import { Services } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";

import { Command } from "./core-status";

describe<{
	cli: Console;
	processManager: Services.ProcessManager;
}>("CoreStatusCommand", ({ beforeEach, it, assert, stub, clock }) => {
	beforeEach((context) => {
		// 1d 1h 1m 1s after pm_uptime, so the uptime cells are deterministic.
		clock({ now: 1_387_045_673_686 + 90_061_000 });

		context.cli = new Console();
		context.processManager = context.cli.app.get(Identifiers.Cli.Service.ProcessManager);
	});

	it("should throw if the process does not exist", async ({ cli }) => {
		await assert.rejects(() => cli.execute(Command), 'The "mainsail" process does not exist.');
	});

	it("should render a table with the process information", async ({ processManager, cli }) => {
		stub(processManager, "missing").returnValue(false);
		stub(processManager, "describe").returnValue({
			monit: { cpu: 2, memory: 2048 },
			name: "mainsail",
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
			["1", "mainsail", "1.0.0", "online", "1d 1h 1m 1s", "2%", "2.05 kB"].every((column) =>
				message.includes(column),
			),
		);
	});
});
