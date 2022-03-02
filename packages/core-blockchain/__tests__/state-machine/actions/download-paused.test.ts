import { Container } from "@arkecosystem/core-kernel";

import { DownloadPaused } from "../../../source/state-machine/actions/download-paused";

describe("DownloadPaused", () => {
	const container = new Container.Container();

	const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() };

	const application = { resolve: jest.fn() };

	beforeAll(() => {
		container.unbindAll();
		container.bind(Identifiers.Application).toConstantValue(application);
		container.bind(Identifiers.LogService).toConstantValue(logger);
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe("handle", () => {
		it("should log 'Blockchain download paused'", () => {
			const downloadPaused = container.resolve<DownloadPaused>(DownloadPaused);

			downloadPaused.handle();

			expect(logger.info).toHaveBeenCalledTimes(1);
			expect(logger.info).toHaveBeenCalledWith("Blockchain download paused");
		});
	});
});
