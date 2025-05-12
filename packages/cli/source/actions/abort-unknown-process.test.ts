import { Container } from "@mainsail/container";

import { describe } from "../../../test-framework/source";
import { ProcessIdentifier } from "../contracts";
import { Identifiers } from "../ioc/index.js";
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
		const container = new Container();
		container.bind(Identifiers.ProcessManager).toConstantValue(processManager);
		context.action = container.get(AbortUnknownProcess, { autobind: true });
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
