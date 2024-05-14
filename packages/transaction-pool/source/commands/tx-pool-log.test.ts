import { Identifiers } from "@mainsail/cli";

import { Console, describe } from "../../../test-framework/source";
import { Command } from "./tx-pool-log";

describe<{
	cli: Console;
}>("LogCommand", ({ beforeEach, it, stub }) => {
	const process = {
		log: () => {},
	};

	beforeEach((context) => {
		context.cli = new Console();

		context.cli.app.rebind(Identifiers.ProcessFactory).toFactory(() => () => process);
		context.cli.app.rebind(Identifiers.Application.Name).toConstantValue("mainsail-tx-pool");
	});

	it("should call process log", async ({ cli }) => {
		const spyLog = stub(process, "log");

		await cli.execute(Command);

		spyLog.calledOnce();
	});
});
