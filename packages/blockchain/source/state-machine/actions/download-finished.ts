import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Action } from "../contracts";

@injectable()
export class DownloadFinished implements Action {
	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	public async handle(): Promise<void> {
		this.logger.info("Block download finished");

		this.blockchain.dispatch("PROCESSFINISHED");
	}
}
