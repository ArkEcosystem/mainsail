import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";

import { Action } from "../contracts";

@injectable()
export class DownloadBlocks implements Action {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.PeerNetworkMonitor)
	private readonly networkMonitor!: Contracts.P2P.NetworkMonitor;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots: Contracts.Crypto.Slots;

	public async handle(): Promise<void> {
		const lastDownloadedBlock: Contracts.Crypto.IBlockData =
			this.stateStore.getLastDownloadedBlock() || this.stateStore.getLastBlock().data;

		const blocks: Contracts.Crypto.IBlockData[] = await this.networkMonitor.downloadBlocksFromHeight(
			lastDownloadedBlock.height,
		);

		if (this.blockchain.isStopped()) {
			return;
		}

		// Could have changed since entering this function, e.g. due to a rollback.
		const lastDownloadedBlockFromStore = this.stateStore.getLastDownloadedBlock();
		if (lastDownloadedBlockFromStore && lastDownloadedBlock.id !== lastDownloadedBlockFromStore.id) {
			return;
		}

		const empty: boolean = !blocks || blocks.length === 0;

		const chained: boolean = !empty && (await AppUtils.isBlockChained(lastDownloadedBlock, blocks[0], this.slots));

		if (chained) {
			this.logger.info(
				`Downloaded ${blocks.length} new ${AppUtils.pluralize(
					"block",
					blocks.length,
				)} accounting for a total of ${AppUtils.pluralize(
					"transaction",
					blocks.reduce((sum, b) => sum + b.numberOfTransactions, 0),
					true,
				)}`,
			);

			try {
				this.blockchain.enqueueBlocks(blocks);
				// eslint-disable-next-line unicorn/prefer-at
				this.stateStore.setLastDownloadedBlock(blocks[blocks.length - 1]);
				this.blockchain.dispatch("DOWNLOADED");
			} catch {
				this.logger.warning(`Failed to enqueue downloaded block.`);

				this.blockchain.dispatch("NOBLOCK");

				return;
			}
		} else {
			if (empty) {
				this.logger.info(
					`Could not download any blocks from any peer from height ${(
						lastDownloadedBlock.height + 1
					).toLocaleString()}`,
				);
			} else {
				this.logger.warning(`Downloaded block not accepted: ${JSON.stringify(blocks[0])}`);
				this.logger.warning(`Last downloaded block: ${JSON.stringify(lastDownloadedBlock)}`);

				this.blockchain.clearQueue();
			}

			if (this.blockchain.getQueue().size() === 0) {
				this.stateStore.setNoBlockCounter(this.stateStore.getNoBlockCounter() + 1);
				this.stateStore.setLastDownloadedBlock(this.stateStore.getLastBlock().data);
			}

			this.blockchain.dispatch("NOBLOCK");
		}
	}
}
