import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { constants } from "./constants";
import { HeaderService } from "./header-service";

const header = (blockNumber: number): any => ({ blockNumber, round: 0, step: 0 });

describe<{
	headerService: HeaderService;
	repository: any;
	blockDownloader: any;
	proposalDownloader: any;
	messageDownloader: any;
	logger: any;
	peer: any;
}>("HeaderService", ({ it, assert, beforeEach, afterEach, spy }) => {
	// `sleep` holds the real setTimeout, which fake timers do not reach; the delay is shortened instead.
	const delay = constants.CHECK_HEADER_DELAY;
	const elapse = async (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 20));

	afterEach(() => {
		constants.CHECK_HEADER_DELAY = delay;
	});

	beforeEach((context) => {
		constants.CHECK_HEADER_DELAY = 1;

		context.peer = { ip: "1.1.1.1" };
		context.repository = { hasActivePeer: () => true };
		context.blockDownloader = { download: () => {} };
		context.proposalDownloader = { download: () => {} };
		context.messageDownloader = { download: () => {} };
		context.logger = { debug: () => {} };

		const app = new Application();
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.P2P.Downloader.Block).toConstantValue(context.blockDownloader);
		app.bind(Identifiers.P2P.Downloader.Proposal).toConstantValue(context.proposalDownloader);
		app.bind(Identifiers.P2P.Downloader.Message).toConstantValue(context.messageDownloader);
		app.bind(Identifiers.P2P.Logger).toConstantValue(context.logger);

		context.headerService = app.resolve(HeaderService);
	});

	it("should record the header at once and start the downloads after the delay", async ({
		headerService,
		peer,
		blockDownloader,
		proposalDownloader,
		messageDownloader,
	}) => {
		const downloads = [blockDownloader, proposalDownloader, messageDownloader].map((downloader) =>
			spy(downloader, "download"),
		);

		headerService.handle(peer, header(7));

		assert.equal(peer.header, header(7));
		for (const download of downloads) {
			download.neverCalled();
		}

		await elapse();

		for (const download of downloads) {
			download.calledOnce();
			download.calledWith(peer);
		}
	});

	it("should run one check per peer at a time, on the latest header", async ({
		headerService,
		peer,
		blockDownloader,
	}) => {
		const download = spy(blockDownloader, "download");

		headerService.handle(peer, header(7));
		headerService.handle(peer, header(8));
		await elapse();

		download.calledOnce();
		assert.equal(peer.header, header(8));

		headerService.handle(peer, header(9));
		await elapse();

		download.calledTimes(2);
	});

	it("should not start downloads for a peer that is no longer active", async ({
		headerService,
		peer,
		repository,
		blockDownloader,
	}) => {
		const download = spy(blockDownloader, "download");
		repository.hasActivePeer = () => false;

		headerService.handle(peer, header(7));
		await elapse();

		download.neverCalled();
	});

	it("should log a download that fails to start instead of leaving the rejection unhandled", async ({
		headerService,
		peer,
		blockDownloader,
		logger,
	}) => {
		blockDownloader.download = () => {
			throw new Error("boom");
		};
		const debug = spy(logger, "debug");

		headerService.handle(peer, header(7));
		await elapse();

		debug.calledWith("Checking the header of 1.1.1.1 failed: boom", "p2p");
	});
});
