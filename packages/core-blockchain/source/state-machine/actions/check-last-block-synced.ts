import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Container } from "@arkecosystem/core-kernel";

import { Action } from "../contracts";

@Container.injectable()
export class CheckLastBlockSynced implements Action {
	@Container.inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@Container.inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	public async handle(): Promise<void> {
		this.blockchain.dispatch(this.blockchain.isSynced() ? "SYNCED" : "NOTSYNCED");
	}
}
