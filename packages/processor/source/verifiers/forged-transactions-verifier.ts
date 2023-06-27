import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class ForgedTransactionsVerifier implements Contracts.BlockProcessor.Handler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	public async execute(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<boolean> {
		const block = unit.getBlock();

		if (block.transactions.length > 0) {
			const transactionIds = block.transactions.map((tx) => {
				Utils.assert.defined<string>(tx.id);

				return tx.id;
			});

			const forgedIds: string[] = await this.databaseService.getForgedTransactionsIds(transactionIds);

			if (this.stateStore.getLastBlock().data.height !== this.stateStore.getLastStoredBlockHeight()) {
				const transactionIdsSet = new Set<string>(transactionIds);

				for (const stateBlock of this.stateStore
					.getLastBlocks()
					.filter((block) => block.data.height > this.stateStore.getLastStoredBlockHeight())) {
					for (const tx of stateBlock.transactions) {
						Utils.assert.defined<string>(tx.id);

						if (transactionIdsSet.has(tx.id)) {
							forgedIds.push(tx.id);
						}
					}
				}
			}

			if (forgedIds.length > 0) {
				this.logger.warning(
					`Block ${block.data.height.toLocaleString()} disregarded, because it contains already forged transactions`,
				);

				this.logger.debug(`${JSON.stringify(forgedIds, undefined, 4)}`);

				return false;
			}
		}

		return true;
	}
}
