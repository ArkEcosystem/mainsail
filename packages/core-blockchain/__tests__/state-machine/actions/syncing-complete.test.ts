import { Container } from "@arkecosystem/core-kernel";

import { SyncingComplete } from "../../../source/state-machine/actions/syncing-complete";

describe("Stopped", () => {
	const container = new Container.Container();

	const logger = { debug: jest.fn(), info: jest.fn(), warning: jest.fn() };
	const blockchain = { dispatch: jest.fn() };

	const application = { get: jest.fn() };

	beforeAll(() => {
		container.unbindAll();
		container.bind(Identifiers.Application).toConstantValue(application);
		container.bind(Identifiers.LogService).toConstantValue(logger);
		container.bind(Identifiers.BlockchainService).toConstantValue(blockchain);
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe("handle", () => {
		it("should dispatch SYNCFINISHED", () => {
			const syncingComplete = container.resolve<SyncingComplete>(SyncingComplete);

			syncingComplete.handle();

			expect(blockchain.dispatch).toHaveBeenCalledTimes(1);
			expect(blockchain.dispatch).toHaveBeenCalledWith("SYNCFINISHED");
		});
	});
});
