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

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	public async handle(data: { block: string; failedTransactions: string[] }): Promise<void> {
		try {

			const block = await this.blockFactory.fromHex(data.block);
			this.stateStore.setLastBlock(block);
			this.configuration.setHeight(block.data.height + 1);


			await this.transactionPoolService.commit(block, data.failedTransactions);

			if (this.configuration.isNewMilestone()) {
				void this.transactionPoolService.reAddTransactions();
			}
		} catch (error) {
			throw new Error(`Failed to commit block: ${error.message}`);
		}
	}
}
