import { describe } from "../../../core-test-framework";
import { ProcessIdentifier } from "../contracts";
import { Container, Identifiers } from "../ioc";
import { ProcessManager } from "../services";
import { AbortUnknownProcess } from "./abort-unknown-process";

describe<{
	action: AbortUnknownProcess;
}>("AbortUnknownProcess", ({ beforeEach, it, assert, stub }) => {
	const processName = "ark-core";

	const processManager: Partial<ProcessManager> = {
		isUnknown: (id: ProcessIdentifier) => false,
	};

	beforeEach((context) => {
		const app = new Container();
		app.bind(Identifiers.ProcessManager).toConstantValue(processManager);
		context.action = app.resolve(AbortUnknownProcess);
	});

	it("should not throw if the process is not unknown", ({ action }) => {
		const spyIsErrored = stub(processManager, "isUnknown").returnValue(false);

		action.execute(processName);
		spyIsErrored.calledOnce();
	});

	it("should throw if the process is unknown", ({ action }) => {
		const spyIsErrored = stub(processManager, "isUnknown").returnValue(true);

		assert.throws(() => {
			action.execute(processName);
		}, `The "${processName}" process has entered an unknown state.`);
		spyIsErrored.calledOnce();
	});
});
