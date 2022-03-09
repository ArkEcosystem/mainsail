import { Container } from "@arkecosystem/core-kernel";
import { describe } from "../../../../core-test-framework";

import { Stopped } from "./stopped";

describe<{
	container: Container.Container;
	logger: any;
	application: any;
}>("Stopped", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.logger = {
			warning: () => undefined,
			debug: () => undefined,
			info: () => undefined,
		};

		context.application = {
			get: () => undefined,
		};

		context.container = new Container.Container();
		context.container.bind(Container.Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Container.Identifiers.LogService).toConstantValue(context.logger);
	});

	it("should log 'The blockchain has been stopped'", (context) => {
		const stopped = context.container.resolve<Stopped>(Stopped);

		const infoLoggerSpy = spy(context.logger, "info");

		stopped.handle();

		infoLoggerSpy.calledOnce();
		infoLoggerSpy.calledWith("The blockchain has been stopped");
	});
});
