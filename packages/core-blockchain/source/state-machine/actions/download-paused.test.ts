import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";

import { describe } from "../../../../core-test-framework";
import { DownloadPaused } from "./download-paused";

describe<{
	container: Container;
	logger;
	application;
}>("DownloadPaused", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.logger = {
			debug: () => {},
			error: () => {},
			info: () => {},
			warning: () => {},
		};
		context.application = {
			resolve: () => {},
		};

		context.container = new Container();
		context.container.bind(Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Identifiers.LogService).toConstantValue(context.logger);
	});

	it("should log 'Blockchain download paused'", async (context) => {
		const downloadPaused = context.container.resolve<DownloadPaused>(DownloadPaused);

		const infoLoggerSpy = spy(context.logger, "info");

		await downloadPaused.handle();

		infoLoggerSpy.calledOnce();
		infoLoggerSpy.calledWith("Blockchain download paused");
	});
});
