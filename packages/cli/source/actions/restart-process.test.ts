import { Options as OraOptions, Ora } from "ora";

import { describe } from "../../../core-test-framework";
import { Spinner } from "../components";
import { ProcessIdentifier } from "../contracts";
import { Container, Identifiers } from "../ioc";
import { ProcessManager } from "../services";
import { RestartProcess } from "./restart-process";

describe<{
	action: RestartProcess;
}>("RestartProcess", ({ beforeEach, it, assert, stub, spy }) => {
	const processName = "ark-core";

	const processManager: Partial<ProcessManager> = {
		restart: (id: ProcessIdentifier): any => {},
	};

	const ora: Partial<Ora> = {
		stop: () => this,
	};

	const spinner: Spinner = {
		render: (options?: string | OraOptions | undefined): Ora => ora as Ora,
	};

	let spyOnSpinnerRender;
	let spyOnSpinnerStop;

	beforeEach((context) => {
		spyOnSpinnerRender = spy(spinner, "render");
		spyOnSpinnerStop = spy(ora, "stop");

		const app = new Container();
		app.bind(Identifiers.Application).toConstantValue(app);
		app.bind(Identifiers.ProcessManager).toConstantValue(processManager);
		app.bind(Identifiers.Spinner).toConstantValue(spinner);
		context.action = app.resolve(RestartProcess);
	});

	it("should restart process", ({ action }) => {
		const spyOnRestart = spy(processManager, "restart");

		action.execute(processName);

		spyOnRestart.calledOnce();
		// TODO: Called with
		spyOnSpinnerRender.calledOnce();
		spyOnSpinnerStop.calledOnce();
	});

	it("should throw", ({ action }) => {
		const spyOnRestart = stub(processManager, "restart").callsFake(() => {
			throw new Error("Dummy error");
		});

		assert.throws(() => {
			action.execute(processName);
		}, "Dummy error");
		spyOnRestart.calledOnce();

		spyOnSpinnerRender.calledOnce();
		spyOnSpinnerStop.calledOnce();
	});

	it("should throw with stderr", ({ action }) => {
		const spyOnRestart = stub(processManager, "restart").callsFake(() => {
			const error: Error = new Error("Dummy error");
			// @ts-ignore
			error.stderr = "error output";
			throw error;
		});

		assert.throws(() => {
			action.execute(processName);
		}, "Dummy error: error output");
		spyOnRestart.calledOnce();

		spyOnSpinnerRender.calledOnce();
		spyOnSpinnerStop.calledOnce();
	});
});
