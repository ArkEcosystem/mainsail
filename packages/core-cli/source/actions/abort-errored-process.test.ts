import { describe } from "../../../core-test-framework";
import { ProcessIdentifier } from "../contracts";
import { Container, Identifiers } from "../ioc";
import { ProcessManager } from "../services";
import { AbortErroredProcess } from "./abort-errored-process";

describe<{
	action: AbortErroredProcess;
}>("AbortErroredProcess", ({ beforeEach, it, assert, stub }) => {
	const processName = "ark-core";

	const processManager: Partial<ProcessManager> = {
		isErrored: (id: ProcessIdentifier) => false,
	};

	beforeEach((context) => {
		const app = new Container();
		app.bind(Identifiers.ProcessManager).toConstantValue(processManager);
		context.action = app.resolve(AbortErroredProcess);
	});

	it("should not throw if the process is errored", ({ action }) => {
		const spyIsErrored = stub(processManager, "isErrored").returnValue(false);

		action.execute(processName);
		spyIsErrored.calledOnce();
	});

	it("should throw if the process is not errored", ({ action }) => {
		const spyIsErrored = stub(processManager, "isErrored").returnValue(true);

		assert.throws(() => {
			action.execute(processName);
		}, `The "${processName}" process has errored.`);
		spyIsErrored.calledOnce();
	});
});
