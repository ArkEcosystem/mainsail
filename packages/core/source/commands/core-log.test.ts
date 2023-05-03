import { Container } from "@mainsail/core-cli";
import { Console, describe } from "@mainsail/core-test-framework";

import { Command } from "./core-log";

describe<{
	cli: Console;
}>("CoreLogCommnad", ({ beforeEach, it, stub }) => {
	const process = {
		log: () => {},
	};

	beforeEach((context) => {
		context.cli = new Console();

		context.cli.app.rebind(Container.Identifiers.ProcessFactory).toFactory(() => () => process);
	});

	it("should call process log", async ({ cli }) => {
		const spyLog = stub(process, "log");

		await cli.execute(Command);

		spyLog.calledOnce();
	});
});
