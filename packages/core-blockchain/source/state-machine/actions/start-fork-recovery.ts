import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";
import { injectable, inject } from "@arkecosystem/core-container";

import { Action } from "../contracts";

@injectable()
export class StartForkRecovery implements Action {
	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.PeerNetworkMonitor)
	private readonly networkMonitor!: Contracts.P2P.NetworkMonitor;

	public async handle(): Promise<void> {
		this.logger.info("Starting fork recovery");

		this.blockchain.clearAndStopQueue();

		const random: number = 4 + Math.floor(Math.random() * 99); // random int inside [4, 102] range
		const blocksToRemove: number = this.stateStore.getNumberOfBlocksToRollback() || random;

		await this.blockchain.removeBlocks(blocksToRemove);

		this.stateStore.setNumberOfBlocksToRollback(0);

		this.logger.info(`Removed ${AppUtils.pluralize("block", blocksToRemove, true)}`);

		await this.networkMonitor.refreshPeersAfterFork();

		this.blockchain.dispatch("SUCCESS");
		await this.blockchain.getQueue().resume();
	}
}
