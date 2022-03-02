import { Container } from "@arkecosystem/core-kernel";

import { CheckLastBlockSynced } from "../../../source/state-machine/actions/check-last-block-synced";

describe("CheckLastBlockSynced", () => {
	const container = new Container.Container();

	const blockchain = { dispatch: jest.fn(), isSynced: jest.fn() };

	const application = { resolve: jest.fn() };

	beforeAll(() => {
		container.unbindAll();
		container.bind(Identifiers.Application).toConstantValue(application);
		container.bind(Identifiers.BlockchainService).toConstantValue(blockchain);
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe("handle", () => {
		it("should dispatch SYNCED if blockchain is synced", () => {
			const checkLastBlockSynced = container.resolve<CheckLastBlockSynced>(CheckLastBlockSynced);

			blockchain.isSynced = jest.fn().mockReturnValue(true);
			checkLastBlockSynced.handle();

			expect(blockchain.dispatch).toHaveBeenCalledTimes(1);
			expect(blockchain.dispatch).toHaveBeenLastCalledWith("SYNCED");
		});

		it("should dispatch NOTSYNCED if blockchain is not synced", () => {
			const checkLastBlockSynced = container.resolve<CheckLastBlockSynced>(CheckLastBlockSynced);

			blockchain.isSynced = jest.fn().mockReturnValue(false);
			checkLastBlockSynced.handle();

			expect(blockchain.dispatch).toHaveBeenCalledTimes(1);
			expect(blockchain.dispatch).toHaveBeenLastCalledWith("NOTSYNCED");
		});
	});
});
