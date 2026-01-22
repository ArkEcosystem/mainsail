import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";
import { ActionFactory } from "./action-factory";
import { Console } from "./test/index.js";

describe<{
	cli: Console;
}>("ActionFactory", ({ beforeEach, it, stub, each, assert }) => {
	beforeEach((context) => {
		context.cli = new Console();
	});

	it("should create an instance", ({ cli }) => {
		assert.instance(cli.app.resolve(ActionFactory), ActionFactory);
	});

	each(
		"should call be called",
		async ({ context, dataset }) => {
			const spy = stub(context.cli.app.get(dataset[1]), "execute");

			await context.cli.app.resolve(ActionFactory)[dataset[0]]();

			spy.calledOnce();
		},
		[
			["abortErroredProcess", Identifiers.Cli.Action.AbortErroredProcess],
			["abortMissingProcess", Identifiers.Cli.Action.AbortMissingProcess],
			["abortRunningProcess", Identifiers.Cli.Action.AbortRunningProcess],
			["abortStoppedProcess", Identifiers.Cli.Action.AbortStoppedProcess],
			["abortUnknownProcess", Identifiers.Cli.Action.AbortUnknownProcess],
			["daemonizeProcess", Identifiers.Cli.Action.DaemonizeProcess],
			["restartProcess", Identifiers.Cli.Action.RestartProcess],
			["restartRunningProcess", Identifiers.Cli.Action.RestartRunningProcess],
			["restartRunningProcessWithPrompt", Identifiers.Cli.Action.RestartRunningProcessWithPrompt],
		],
	);
});
