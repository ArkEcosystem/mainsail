import { inject, injectable, tagged } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { DatabaseService } from "@arkecosystem/core-database";
import { Enums } from "@arkecosystem/core-kernel";

import { RoundState } from "./round-state";

@injectable()
export class DatabaseInteraction {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.DatabaseService)
	private readonly databaseService!: DatabaseService;

	@inject(Identifiers.BlockState)
	@tagged("state", "blockchain")
	private readonly blockState!: Contracts.State.BlockState;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.StateTransactionStore)
	private readonly stateTransactionStore!: Contracts.State.TransactionStore;

	@inject(Identifiers.StateBlockStore)
	private readonly stateBlockStore!: Contracts.State.BlockStore;

	@inject(Identifiers.TransactionHandlerRegistry)
	@tagged("state", "blockchain")
	private handlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.RoundState)
	private readonly roundState!: RoundState;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory: Contracts.Crypto.IBlockFactory;

	public async initialize(): Promise<void> {
		try {
			await this.events.dispatch(Enums.StateEvent.Starting);

			const genesisBlockJson = this.configuration.get("genesisBlock");
			const genesisBlock = await this.blockFactory.fromJson(genesisBlockJson);

			this.stateStore.setGenesisBlock(genesisBlock);

			if (process.env.CORE_RESET_DATABASE) {
				await this.reset();
			}

			await this.initializeLastBlock();
		} catch (error) {
			this.logger.error(error.stack);

			await this.app.terminate("Failed to initialize database service.", error);
		}
	}

	public async applyBlock(block: Contracts.Crypto.IBlock): Promise<void> {
		await this.roundState.detectMissedBlocks(block);

		await this.blockState.applyBlock(block);
		await this.roundState.applyBlock(block);

		for (const transaction of block.transactions) {
			await this.emitTransactionEvents(transaction);
		}

		this.events.dispatch(Enums.BlockEvent.Applied, block.data);
	}

	public async revertBlock(block: Contracts.Crypto.IBlock): Promise<void> {
		await this.roundState.revertBlock(block);
		await this.blockState.revertBlock(block);

		for (let index = block.transactions.length - 1; index >= 0; index--) {
			this.events.dispatch(Enums.TransactionEvent.Reverted, block.transactions[index].data);
		}

		this.events.dispatch(Enums.BlockEvent.Reverted, block.data);
	}

	public async restoreCurrentRound(): Promise<void> {
		await this.roundState.restore();
	}

	// TODO: Remove
	public async getActiveValidators(
		roundInfo?: Contracts.Shared.RoundInfo,
		validators?: Contracts.State.Wallet[],
	): Promise<Contracts.State.Wallet[]> {
		return this.roundState.getActiveValidators(roundInfo, validators);
	}

	private async reset(): Promise<void> {
		await this.databaseService.reset();
		await this.createGenesisBlock();
	}

	private async initializeLastBlock(): Promise<void> {
		let lastBlock: Contracts.Crypto.IBlock | undefined;

		// Ensure the config manager is initialized, before attempting to call `fromData`
		// which otherwise uses potentially wrong milestones.
		let lastHeight = 1;
		const latest: Contracts.Crypto.IBlockData | undefined = await this.databaseService.findLatestBlock();
		if (latest) {
			lastHeight = latest.height;
		}

		this.configuration.setHeight(lastHeight);

		lastBlock = await this.databaseService.getLastBlock();

		if (!lastBlock) {
			this.logger.warning("No block found in database");
			lastBlock = await this.createGenesisBlock();
		}

		this.configureState(lastBlock);
	}

	private async createGenesisBlock(): Promise<Contracts.Crypto.IBlock> {
		const genesisBlock = this.stateStore.getGenesisBlock();
		await this.databaseService.saveBlocks([genesisBlock]);
		return genesisBlock;
	}

	private configureState(lastBlock: Contracts.Crypto.IBlock): void {
		this.stateStore.setLastBlock(lastBlock);
		const { blocktime, block } = this.configuration.getMilestone();
		const blocksPerDay: number = Math.ceil(86_400 / blocktime);
		this.stateBlockStore.resize(blocksPerDay);
		this.stateTransactionStore.resize(blocksPerDay * block.maxTransactions);
	}

	private async emitTransactionEvents(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		this.events.dispatch(Enums.TransactionEvent.Applied, transaction.data);
		const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);
		// ! no reason to pass this.emitter
		handler.emitEvents(transaction, this.events);
	}
}
