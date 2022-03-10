import { Container } from "@arkecosystem/core-kernel";
import { describe } from "../../../../core-test-framework";

import { DownloadPaused } from "./download-paused";

describe<{
	container: Container.Container;
	logger;
	application;
}>("DownloadPaused", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.logger = {
			warning: () => undefined,
			debug: () => undefined,
			info: () => undefined,
			error: () => undefined,
		};
		context.application = {
			resolve: () => undefined,
		};

		context.container = new Container.Container();
		context.container.bind(Container.Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Container.Identifiers.LogService).toConstantValue(context.logger);
	});

	it("should log 'Blockchain download paused'", (context) => {
		const downloadPaused = context.container.resolve<DownloadPaused>(DownloadPaused);

		const infoLoggerSpy = spy(context.logger, "info");

		downloadPaused.handle();

		infoLoggerSpy.calledOnce();
		infoLoggerSpy.calledWith("Blockchain download paused");
	});
});
