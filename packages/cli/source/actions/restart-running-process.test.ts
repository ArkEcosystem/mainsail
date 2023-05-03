import { describe } from "../../../core-test-framework";
import { ProcessIdentifier } from "../contracts";
import { Container, Identifiers } from "../ioc";
import { ProcessManager } from "../services";
import { RestartProcess } from "./restart-process";
import { RestartRunningProcess } from "./restart-running-process";

describe<{
	action: RestartRunningProcess;
}>("RestartRunningProcess", ({ beforeEach, it, assert, stub, spy }) => {
	const processName = "ark-core";

	const processManager: Partial<ProcessManager> = {
		isOnline: (id: ProcessIdentifier) => false,
	};

	const restartProcess: Partial<RestartProcess> = {
		execute: (processName: string) => {},
	};

	beforeEach((context) => {
		const app = new Container();
		app.bind(Identifiers.Application).toConstantValue(app);
		app.bind(Identifiers.ProcessManager).toConstantValue(processManager);
		app.bind(Identifiers.RestartProcess).toConstantValue(restartProcess);
		context.action = app.resolve(RestartRunningProcess);
	});

	it("should not restart the process if it is not online", ({ action }) => {
		const spyOnExecute = spy(restartProcess, "execute");
		const spyIsOnline = stub(processManager, "isOnline").returnValue(false);

		action.execute(processName);

		spyOnExecute.neverCalled();
		spyIsOnline.calledOnce();
	});

	it("should restart the process", ({ action }) => {
		const spyOnExecute = spy(restartProcess, "execute");
		const spyIsOnline = stub(processManager, "isOnline").returnValue(true);

		action.execute(processName);

		spyOnExecute.calledOnce();
		spyIsOnline.calledOnce();
	});
});
