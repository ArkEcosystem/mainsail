import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { Action } from "../contracts";

@injectable()
export class CheckLater implements Action {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	public async handle(): Promise<void> {
		if (!this.blockchain.isStopped() && !this.stateStore.isWakeUpTimeoutSet()) {
			this.blockchain.setWakeUp();
		}
	}
}
