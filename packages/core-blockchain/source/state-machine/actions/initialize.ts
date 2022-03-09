import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";
import { DatabaseInteraction } from "@arkecosystem/core-state";

import { Action } from "../contracts";

@injectable()
export class Initialize implements Action {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.TransactionPoolService)
	private readonly transactionPool!: Contracts.TransactionPool.Service;

	@inject(Identifiers.Database.Service)
	private readonly databaseService: Contracts.Database.IDatabaseService;

	@inject(Identifiers.DatabaseInteraction)
	private readonly databaseInteraction!: DatabaseInteraction;

	@inject(Identifiers.PeerNetworkMonitor)
	private readonly networkMonitor!: Contracts.P2P.NetworkMonitor;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	public async handle(): Promise<void> {
		try {
			const block: Contracts.Crypto.IBlock = this.stateStore.getLastBlock();

			if (!this.stateStore.getRestoredDatabaseIntegrity()) {
				this.logger.info("Verifying database integrity");

				if (!(await this.databaseService.verifyBlockchain())) {
					return this.blockchain.dispatch("ROLLBACK");
				}

				this.logger.info("Verified database integrity");
			} else {
				this.logger.info("Skipping database integrity check after successful database recovery");
			}

			// only genesis block? special case of first round needs to be dealt with
			if (block.data.height === 1) {
				if (block.data.payloadHash !== this.configuration.get("network.nethash")) {
					this.logger.error(
						`FATAL: The genesis block payload hash (${
							block.data.payloadHash
						}) is different from configured the nethash (${this.configuration.get("network.nethash")})`,
					);

					return this.blockchain.dispatch("FAILURE");
				}

				await this.databaseService.deleteRound(1);
			}

			/** *******************************
			 *  state machine data init      *
			 ******************************* */
			// Delete all rounds from the future due to shutdown before processBlocks finished writing the blocks.
			const roundInfo = AppUtils.roundCalculator.calculateRound(block.data.height, this.configuration);
			await this.databaseService.deleteRound(roundInfo.round + 1);

			if (this.stateStore.getNetworkStart()) {
				await this.app.get<Contracts.State.StateBuilder>(Identifiers.StateBuilder).run();
				await this.databaseInteraction.restoreCurrentRound();
				await this.transactionPool.readdTransactions();
				await this.networkMonitor.boot();

				return this.blockchain.dispatch("STARTED");
			}

			if (process.env.NODE_ENV === "test") {
				this.logger.notice("TEST SUITE DETECTED! SYNCING WALLETS AND STARTING IMMEDIATELY.");

				await this.app.get<Contracts.State.StateBuilder>(Identifiers.StateBuilder).run();
				await this.databaseInteraction.restoreCurrentRound();
				await this.networkMonitor.boot();

				return this.blockchain.dispatch("STARTED");
			}

			this.logger.info(`Last block in database: ${block.data.height.toLocaleString()}`);

			/** *******************************
			 * database init                 *
			 ******************************* */
			// Integrity Verification

			await this.app.get<Contracts.State.StateBuilder>(Identifiers.StateBuilder).run();

			await this.databaseInteraction.restoreCurrentRound();
			await this.transactionPool.readdTransactions();

			await this.networkMonitor.boot();

			return this.blockchain.dispatch("STARTED");
		} catch (error) {
			this.logger.error(error.stack);

			return this.blockchain.dispatch("FAILURE");
		}
	}
}
