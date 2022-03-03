import { inject, injectable, tagged } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { DatabaseService } from "@arkecosystem/core-database";
import { Providers } from "@arkecosystem/core-kernel";

import { Action } from "../contracts";

@injectable()
export class RollbackDatabase implements Action {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "core-blockchain")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.DatabaseService)
	private readonly databaseService!: DatabaseService;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	public async handle(): Promise<void> {
		this.logger.info("Trying to restore database integrity");

		let maxBlockRewind = this.configuration.getRequired<number>("databaseRollback.maxBlockRewind");
		let steps = this.configuration.getRequired<number>("databaseRollback.steps");

		let lastBlock: Contracts.Crypto.IBlock = await this.databaseService.getLastBlock();
		let lastBlockHeight = lastBlock.data.height;

		let isVerified = false;

		while (!isVerified && maxBlockRewind > 0 && lastBlockHeight > 1) {
			if (lastBlockHeight - steps < 1) {
				steps = lastBlockHeight - 1;
			}
			maxBlockRewind -= steps;
			lastBlockHeight -= steps;

			await this.blockchain.removeTopBlocks(steps);

			isVerified = await this.databaseService.verifyBlockchain();
		}

		if (!isVerified) {
			this.blockchain.dispatch("FAILURE");
			return;
		}

		this.stateStore.setRestoredDatabaseIntegrity(true);

		lastBlock = await this.databaseService.getLastBlock();
		this.stateStore.setLastBlock(lastBlock);
		this.stateStore.setLastStoredBlockHeight(lastBlock.data.height);

		this.logger.info(
			`Database integrity verified again after rollback to height ${lastBlock.data.height.toLocaleString()}`,
		);

		this.blockchain.dispatch("SUCCESS");
	}
}
