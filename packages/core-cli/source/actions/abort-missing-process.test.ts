import { describe } from "../../../core-test-framework";
import { ProcessIdentifier } from "../contracts";
import { Container, Identifiers } from "../ioc";
import { ProcessManager } from "../services";
import { AbortMissingProcess } from "./abort-missing-process";

describe<{
	action: AbortMissingProcess;
}>("AbortMissingProcess", ({ beforeEach, it, assert, stub }) => {
	const processName = "ark-core";

	const processManager: Partial<ProcessManager> = {
		missing: (id: ProcessIdentifier) => false,
	};

	beforeEach((context) => {
		const app = new Container();
		app.bind(Identifiers.ProcessManager).toConstantValue(processManager);
		context.action = app.resolve(AbortMissingProcess);
	});

	it("should not throw if the process does exist", ({ action }) => {
		const spyIsErrored = stub(processManager, "missing").returnValue(false);

		action.execute(processName);
		spyIsErrored.calledOnce();
	});

	it("should throw if the process does not exist", ({ action }) => {
		const spyIsErrored = stub(processManager, "missing").returnValue(true);

		assert.throws(() => {
			action.execute(processName);
		}, `The "${processName}" process does not exist.`);
		spyIsErrored.calledOnce();
	});
});
