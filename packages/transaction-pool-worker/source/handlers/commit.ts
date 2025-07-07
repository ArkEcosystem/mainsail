import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class CommitHandler {
	@inject(Identifiers.State.Store)
	protected readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.TransactionPool.Service)
	private readonly transactionPoolService!: Contracts.TransactionPool.Service;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	public async handle(blockNumber: number, sendersAddresses: string[], consumedGas: number): Promise<void> {
		try {
			this.stateStore.setBlockNumber(blockNumber);

			if (this.configuration.isNewMilestone()) {
				void this.transactionPoolService.reAddTransactions();
			} else {
				await this.transactionPoolService.commit(sendersAddresses, consumedGas);
			}
		} catch (error) {
			throw new Error(`Failed to commit block: ${error.message}`);
		}
	}
}
