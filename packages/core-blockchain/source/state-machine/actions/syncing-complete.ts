import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Container } from "@arkecosystem/core-kernel";

import { Action } from "../contracts";

@Container.injectable()
export class SyncingComplete implements Action {
	@Container.inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@Container.inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@Container.inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	public async handle(): Promise<void> {
		this.logger.info("Blockchain 100% in sync");

		this.blockchain.dispatch("SYNCFINISHED");
	}
}
