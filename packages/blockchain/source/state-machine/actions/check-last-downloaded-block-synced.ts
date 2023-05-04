import { inject, injectable } from "@mainsail/container";
import { Constants, Contracts, Identifiers } from "@mainsail/contracts";

import { Action } from "../contracts";

@injectable()
export class CheckLastDownloadedBlockSynced implements Action {
	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.PeerNetworkMonitor)
	private readonly networkMonitor!: Contracts.P2P.NetworkMonitor;

	public async handle(): Promise<void> {
		let event = "NOTSYNCED";
		this.logger.debug(`Queued chunks of blocks (process: ${this.blockchain.getQueue().size()})`);

		if (this.blockchain.getQueue().size() > 100) {
			event = "PAUSED";
		}

		// tried to download but no luck after 5 tries (looks like network missing blocks)
		if (this.stateStore.getNoBlockCounter() > 5 && !this.blockchain.getQueue().isRunning()) {
			this.logger.info("Tried to sync 5 times to different nodes, looks like the network is missing blocks");

			this.stateStore.setNoBlockCounter(0);
			event = "NETWORKHALTED";

			if (this.stateStore.getP2pUpdateCounter() + 1 > 3) {
				this.logger.info("Network keeps missing blocks.");

				const networkStatus = await this.networkMonitor.checkNetworkHealth();

				if (networkStatus.forked) {
					this.stateStore.setNumberOfBlocksToRollback(networkStatus.blocksToRollback || 0);
					event = "FORK";
				}

				this.stateStore.setP2pUpdateCounter(0);
			} else {
				this.stateStore.setP2pUpdateCounter(this.stateStore.getP2pUpdateCounter() + 1);
			}
		} else if (
			this.stateStore.getLastDownloadedBlock() &&
			this.blockchain.isSynced(this.stateStore.getLastDownloadedBlock())
		) {
			this.stateStore.setNoBlockCounter(0);
			this.stateStore.setP2pUpdateCounter(0);

			event = "SYNCED";
		}

		if (this.stateStore.getNetworkStart()) {
			event = "SYNCED";
		}

		if (process.env[Constants.Flags.CORE_ENV] === "test") {
			event = "TEST";
		}

		this.blockchain.dispatch(event);
	}
}
