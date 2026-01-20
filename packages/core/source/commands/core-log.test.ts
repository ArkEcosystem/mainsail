import { Identifiers } from "@mainsail/constants";
import { Console, describe } from "../../../test-framework/source";

import { Command } from "./core-log";

describe<{
	cli: Console;
}>("CoreLogCommnad", ({ beforeEach, it, stub }) => {
	const process = {
		log: () => {},
	};

	beforeEach((context) => {
		context.cli = new Console();

		context.cli.app.rebind(Identifiers.Cli.ProcessFactory).toFactory(() => () => process);
	});

	it("should call process log", async ({ cli }) => {
		const spyLog = stub(process, "log");

		await cli.execute(Command);

		spyLog.calledOnce();
	});
});
