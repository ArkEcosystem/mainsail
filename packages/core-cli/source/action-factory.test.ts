import { Console, describe } from "../../core-test-framework";
import { ActionFactory } from "./action-factory";
import { Identifiers } from "./ioc";

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
			["abortErroredProcess", Identifiers.AbortErroredProcess],
			["abortMissingProcess", Identifiers.AbortMissingProcess],
			["abortRunningProcess", Identifiers.AbortRunningProcess],
			["abortStoppedProcess", Identifiers.AbortStoppedProcess],
			["abortUnknownProcess", Identifiers.AbortUnknownProcess],
			["daemonizeProcess", Identifiers.DaemonizeProcess],
			["restartProcess", Identifiers.RestartProcess],
			["restartRunningProcess", Identifiers.RestartRunningProcess],
			["restartRunningProcessWithPrompt", Identifiers.RestartRunningProcessWithPrompt],
		],
	);
});
