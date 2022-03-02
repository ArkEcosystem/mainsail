import { CheckLater } from "@packages/core-blockchain/source/state-machine/actions/check-later";
import { Container } from "@packages/core-kernel";

describe("CheckLater", () => {
	const container = new Container.Container();

	const blockchain = { isStopped: jest.fn().mockReturnValue(false), setWakeUp: jest.fn() };
	const stateStore = { isWakeUpTimeoutSet: jest.fn().mockReturnValue(false) };

	const application = { resolve: jest.fn() };

	beforeAll(() => {
		container.unbindAll();
		container.bind(Identifiers.Application).toConstantValue(application);
		container.bind(Identifiers.BlockchainService).toConstantValue(blockchain);
		container.bind(Identifiers.StateStore).toConstantValue(stateStore);
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe("handle", () => {
		it("should call blockchain.setWakeUp() when !blockchain.isStopped && !stateStore.wakeUpTimeout", () => {
			const checkLater = container.resolve<CheckLater>(CheckLater);

			checkLater.handle();

			expect(blockchain.setWakeUp).toHaveBeenCalledTimes(1);
		});

		it("should do nothing otherwise", () => {
			const checkLater = container.resolve<CheckLater>(CheckLater);

			blockchain.isStopped.mockReturnValue(true);
			checkLater.handle();

			expect(blockchain.setWakeUp).toHaveBeenCalledTimes(0);
		});
	});
});
