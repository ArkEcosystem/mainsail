import { StartForkRecovery } from "@packages/core-blockchain/source/state-machine/actions/start-fork-recovery";
import { Container } from "@packages/core-kernel";

describe("StartForkRecovery", () => {
	let container: Container.Container;
	let logger;
	let blockchain;
	let stateStore;
	let peerNetworkMonitor;
	let application;

	beforeEach(() => {
		jest.resetAllMocks();

		logger = { debug: jest.fn(), info: jest.fn(), warning: jest.fn() };
		blockchain = {
			clearAndStopQueue: jest.fn(),
			dispatch: jest.fn(),
			getQueue: jest.fn().mockReturnValue({ resume: jest.fn() }),
			removeBlocks: jest.fn(),
		};
		stateStore = {
			getNumberOfBlocksToRollback: jest.fn().mockReturnValue(0),
			setNumberOfBlocksToRollback: jest.fn(),
		};
		peerNetworkMonitor = { refreshPeersAfterFork: jest.fn() };

		application = {};

		container = new Container.Container();
		container.bind(Identifiers.Application).toConstantValue(application);
		container.bind(Identifiers.LogService).toConstantValue(logger);
		container.bind(Identifiers.BlockchainService).toConstantValue(blockchain);
		container.bind(Identifiers.StateStore).toConstantValue(stateStore);
		container.bind(Identifiers.PeerNetworkMonitor).toConstantValue(peerNetworkMonitor);
	});

	describe("handle", () => {
		it("should clearAndStopQueue, removeBlocks, refreshPeersAfterFork, dispatch SUCCESS and resume queue", async () => {
			const startForkRecovery = container.resolve<StartForkRecovery>(StartForkRecovery);

			const mockRandomValue = 0.1;
			jest.spyOn(Math, "random").mockReturnValueOnce(mockRandomValue);
			await startForkRecovery.handle();

			expect(blockchain.clearAndStopQueue).toHaveBeenCalledTimes(1);
			expect(blockchain.removeBlocks).toHaveBeenCalledTimes(1);
			expect(blockchain.removeBlocks).toHaveBeenCalledWith(4 + Math.floor(mockRandomValue * 99));
			expect(peerNetworkMonitor.refreshPeersAfterFork).toHaveBeenCalledTimes(1);
			expect(blockchain.dispatch).toHaveBeenCalledTimes(1);
			expect(blockchain.dispatch).toHaveBeenCalledWith("SUCCESS");
			expect(blockchain.getQueue().resume).toHaveBeenCalledTimes(1);
		});

		it("should set stateStore.numberOfBlocksToRollback to 0 blocks when defined", async () => {
			const startForkRecovery = container.resolve<StartForkRecovery>(StartForkRecovery);

			stateStore.getNumberOfBlocksToRollback = jest.fn().mockReturnValue(7);
			await startForkRecovery.handle();

			expect(stateStore.setNumberOfBlocksToRollback).toHaveBeenCalledWith(0);
			expect(blockchain.clearAndStopQueue).toHaveBeenCalledTimes(1);
			expect(blockchain.removeBlocks).toHaveBeenCalledTimes(1);
			expect(blockchain.removeBlocks).toHaveBeenCalledWith(7);
			expect(peerNetworkMonitor.refreshPeersAfterFork).toHaveBeenCalledTimes(1);
			expect(blockchain.dispatch).toHaveBeenCalledTimes(1);
			expect(blockchain.dispatch).toHaveBeenCalledWith("SUCCESS");
			expect(blockchain.getQueue().resume).toHaveBeenCalledTimes(1);
		});
	});
});
