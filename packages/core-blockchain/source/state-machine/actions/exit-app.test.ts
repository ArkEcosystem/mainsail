import { Container } from "@arkecosystem/core-kernel";
import { describe } from "../../../../core-test-framework";

import { ExitApp } from "./exit-app";

describe<{
	container: Container.Container;
	application;
}>("ExitApp", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.application = {
			terminate: () => undefined,
		};

		context.container = new Container.Container();
		context.container.bind(Container.Identifiers.Application).toConstantValue(context.application);
	});

	it("should call app.terminate()", (context) => {
		const exitApp = context.container.resolve<ExitApp>(ExitApp);

		const terminateSpy = spy(context.application, "terminate");

		exitApp.handle();

		terminateSpy.calledOnce();
	});
});
