import { describe } from "../../../core-test-framework";
import { ProcessIdentifier } from "../contracts";
import { Container, Identifiers } from "../ioc";
import { ProcessManager } from "../services";
import { AbortStoppedProcess } from "./abort-stopped-process";

describe<{
	action: AbortStoppedProcess;
}>("AbortStoppedProcess", ({ beforeEach, it, assert, stub }) => {
	const processName = "ark-core";

	const processManager: Partial<ProcessManager> = {
		isStopped: (id: ProcessIdentifier) => false,
	};

	beforeEach((context) => {
		const app = new Container();
		app.bind(Identifiers.ProcessManager).toConstantValue(processManager);
		context.action = app.resolve(AbortStoppedProcess);
	});

	it("should not throw if the process is running", ({ action }) => {
		const spyIsErrored = stub(processManager, "isStopped").returnValue(false);

		action.execute(processName);
		spyIsErrored.calledOnce();
	});

	it("should throw if the process is not running", ({ action }) => {
		const spyIsErrored = stub(processManager, "isStopped").returnValue(true);

		assert.throws(() => {
			action.execute(processName);
		}, `The "${processName}" process is not running.`);
		spyIsErrored.calledOnce();
	});
});
