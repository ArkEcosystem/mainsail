import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class CommitHandler {
	@inject(Identifiers.State.Store)
	protected readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.TransactionPool.Service)
	private readonly transactionPoolService!: Contracts.TransactionPool.Service;

	@inject(Identifiers.TransactionPool.Selector)
	private readonly selector!: Contracts.TransactionPool.Selector;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	public async handle(
		blockNumber: number,
		sendersAddresses: string[],
		consumedGas: number,
		isSyncing: boolean,
	): Promise<void> {
		try {
			this.stateStore.setBlockNumber(blockNumber);
			this.selector.clear();

			if (this.configuration.isNewMilestone()) {
				void this.transactionPoolService.reAddTransactions();
			} else {
				await this.transactionPoolService.commit(sendersAddresses, consumedGas, isSyncing);
			}
		} catch (error) {
			throw new Error(`Failed to commit block: ${error.message}`);
		}
	}
}
