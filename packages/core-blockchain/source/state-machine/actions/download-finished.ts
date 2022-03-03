import { inject, injectable } from "@arkecosystem/core-container";
import Contracts, { Identifiers } from "@arkecosystem/core-contracts";

import { Action } from "../contracts";

@injectable()
export class DownloadFinished implements Action {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	public async handle(): Promise<void> {
		this.logger.info("Block download finished");

		if (this.stateStore.getNetworkStart()) {
			// next time we will use normal behaviour
			this.stateStore.setNetworkStart(false);

			this.blockchain.dispatch("SYNCFINISHED");
		} else if (!this.blockchain.getQueue().isRunning()) {
			this.blockchain.dispatch("PROCESSFINISHED");
		}
	}
}
