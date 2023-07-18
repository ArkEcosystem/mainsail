import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Bootstrapper {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	// @inject(Identifiers.BlockchainService)
	// private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.Consensus.Service)
	private readonly consensus!: Contracts.Consensus.IConsensusService;

	// @inject(Identifiers.StateStore)
	// private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.StateBuilder)
	private readonly stateBuilder!: Contracts.State.StateBuilder;

	@inject(Identifiers.TransactionPoolService)
	private readonly transactionPool!: Contracts.TransactionPool.Service;

	// @inject(Identifiers.Database.Service)
	// private readonly databaseService!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.PeerNetworkMonitor)
	private readonly networkMonitor!: Contracts.P2P.NetworkMonitor;

	// @inject(Identifiers.Cryptography.Configuration)
	// private readonly configuration!: Contracts.Crypto.IConfiguration;

	public async bootstrap(): Promise<void> {
		try {
			await this.stateBuilder.run();

			await this.transactionPool.readdTransactions();

			void this.consensus.run();

			await this.networkMonitor.boot();
		} catch (error) {
			this.logger.error(error.stack);
		}
	}

	// TODO: Check legacy bootstrap
	// public async legacy(): Promise<void> {
	// 	try {
	// 		const block: Contracts.Crypto.IBlock = this.stateStore.getLastBlock();

	// 		if (!this.stateStore.getRestoredDatabaseIntegrity()) {
	// 			this.logger.info("Verifying database integrity");

	// 			if (!(await this.databaseService.verifyBlockchain())) {
	// 				// return this.blockchain.dispatch("ROLLBACK");
	// 			}

	// 			this.logger.info("Verified database integrity");
	// 		} else {
	// 			this.logger.info("Skipping database integrity check after successful database recovery");
	// 		}

	// 		// only genesis block? special case of first round needs to be dealt with
	// 		if (block.data.height === 1) {
	// 			if (block.data.payloadHash !== this.configuration.get("network.nethash")) {
	// 				this.logger.error(
	// 					`FATAL: The genesis block payload hash (${
	// 						block.data.payloadHash
	// 					}) is different from configured the nethash (${this.configuration.get("network.nethash")})`,
	// 				);

	// 				// return this.blockchain.dispatch("FAILURE");
	// 			}

	// 			await this.databaseService.deleteRound(1);
	// 		}

	// 		/** *******************************
	// 		 *  state machine data init      *
	// 		 ******************************* */
	// 		// Delete all rounds from the future due to shutdown before processBlocks finished writing the blocks.
	// 		const roundInfo = AppUtils.roundCalculator.calculateRound(block.data.height, this.configuration);
	// 		await this.databaseService.deleteRound(roundInfo.round + 1);

	// 		if (process.env[Constants.Flags.CORE_ENV] === "test") {
	// 			this.logger.notice("TEST SUITE DETECTED! SYNCING WALLETS AND STARTING IMMEDIATELY.");

	// 			await this.app.get<Contracts.State.StateBuilder>(Identifiers.StateBuilder).run();
	// 			void this.consensus.run();
	// 			await this.networkMonitor.boot();

	// 			// return this.blockchain.dispatch("STARTED");
	// 		}

	// 		this.logger.info(`Last block in database: ${block.data.height.toLocaleString()}`);

	// 		/** *******************************
	// 		 * database init                 *
	// 		 ******************************* */
	// 		// Integrity Verification

	// 		await this.app.get<Contracts.State.StateBuilder>(Identifiers.StateBuilder).run();

	// 		await this.transactionPool.readdTransactions();

	// 		void this.consensus.run();

	// 		await this.networkMonitor.boot();

	// 		// return this.blockchain.dispatch("STARTED");
	// 	} catch (error) {
	// 		this.logger.error(error.stack);

	// 		// return this.blockchain.dispatch("FAILURE");
	// 	}
	// }
}
