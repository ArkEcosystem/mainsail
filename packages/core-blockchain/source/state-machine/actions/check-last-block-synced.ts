import { inject, injectable } from "@arkecosystem/core-container";
import Contracts, { Identifiers } from "@arkecosystem/core-contracts";

import { Action } from "../contracts";

@injectable()
export class CheckLastBlockSynced implements Action {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	public async handle(): Promise<void> {
		this.blockchain.dispatch(this.blockchain.isSynced() ? "SYNCED" : "NOTSYNCED");
	}
}
