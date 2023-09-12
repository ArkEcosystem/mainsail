import { Identifiers } from "@mainsail/cli";
import { Console, describe } from "@mainsail/test-framework";

import { Command } from "./api-log";

describe<{
	cli: Console;
}>("ApiLogCommnad", ({ beforeEach, it, stub }) => {
	const process = {
		log: () => {},
	};

	beforeEach((context) => {
		context.cli = new Console();

		context.cli.app.rebind(Identifiers.ProcessFactory).toFactory(() => () => process);
	});

	it("should call process log", async ({ cli }) => {
		const spyLog = stub(process, "log");

		await cli.execute(Command);

		spyLog.calledOnce();
	});
});
