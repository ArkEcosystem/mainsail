import { Console } from "@mainsail/cli";
import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";

import { Command } from "./core-log";

describe<{
	cli: Console;
}>("CoreLogCommand", ({ beforeEach, it, stub }) => {
	const processMock = {
		log: () => {},
	};

	beforeEach((context) => {
		context.cli = new Console();

		context.cli.app.rebind(Identifiers.Cli.ProcessFactory).toFactory(() => () => processMock);
	});

	it("should call process log with the lines flag default", async ({ cli }) => {
		const spyLog = stub(processMock, "log");

		await cli.execute(Command);

		spyLog.calledOnce();
		spyLog.calledWith(false, 15);
	});

	it("should call process log with the [--error] and [--lines] flags", async ({ cli }) => {
		const spyLog = stub(processMock, "log");

		await cli.withFlags({ error: true, lines: 100 }).execute(Command);

		spyLog.calledOnce();
		spyLog.calledWith(true, 100);
	});
});
