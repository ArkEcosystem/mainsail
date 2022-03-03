import { inject, injectable } from "@arkecosystem/core-container";
import Contracts, { Identifiers } from "@arkecosystem/core-contracts";

import { Action } from "../contracts";

@injectable()
export class SyncingComplete implements Action {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	public async handle(): Promise<void> {
		this.logger.info("Blockchain 100% in sync");

		this.blockchain.dispatch("SYNCFINISHED");
	}
}
