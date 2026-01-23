import { Console } from "@mainsail/cli";
import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";

import { Command } from "./api-log";

describe<{
	cli: Console;
}>("ApiLogCommnad", ({ beforeEach, it, stub }) => {
	const process = {
		log: () => { },
	};

	beforeEach((context) => {
		context.cli = new Console();

		context.cli.app.rebind(Identifiers.Cli.ProcessFactory).toFactory(() => () => process);
		context.cli.app.rebind(Identifiers.Cli.Application.Name).toConstantValue("mainsail-api");
	});

	it("should call process log", async ({ cli }) => {
		const spyLog = stub(process, "log");

		await cli.execute(Command);

		spyLog.calledOnce();
	});
});
