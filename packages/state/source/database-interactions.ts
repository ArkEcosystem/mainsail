import { inject, injectable } from "@mainsail/container";
import { Constants, Contracts, Identifiers } from "@mainsail/contracts";
import { Enums } from "@mainsail/kernel";

import { RoundState } from "./round-state";

@injectable()
export class DatabaseInteraction {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Database.Service)
	private readonly databaseService: Contracts.Database.IDatabaseService;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	// @inject(Identifiers.TransactionHandlerRegistry)
	// private handlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

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

			if (process.env[Constants.Flags.CORE_RESET_DATABASE]) {
				await this.#reset();
			}

			await this.#initializeLastBlock();
		} catch (error) {
			this.logger.error(error.stack);

			await this.app.terminate("Failed to initialize database service.", error);
		}
	}

	// public async applyBlock(block: Contracts.Crypto.IBlock): Promise<void> {
	// 	await this.roundState.detectMissedBlocks(block);

	// 	await this.blockState.applyBlock(block);
	// 	await this.roundState.applyBlock(block);

	// 	for (const transaction of block.transactions) {
	// 		await this.#emitTransactionEvents(transaction);
	// 	}

	// 	// eslint-disable-next-line @typescript-eslint/no-floating-promises
	// 	this.events.dispatch(Enums.BlockEvent.Applied, block.data);
	// }

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

	async #reset(): Promise<void> {
		await this.#createGenesisBlock();
	}

	async #initializeLastBlock(): Promise<void> {
		// Ensure the config manager is initialized, before attempting to call `fromData`
		// which otherwise uses potentially wrong milestones.
		let lastHeight = 1;
		const latest: Contracts.Crypto.IBlock | undefined = await this.databaseService.getLastBlock();
		if (latest) {
			lastHeight = latest.data.height;
		}

		this.configuration.setHeight(lastHeight);

		let lastBlock: Contracts.Crypto.IBlock | undefined = await this.databaseService.getLastBlock();

		if (!lastBlock) {
			this.logger.warning("No block found in database");
			lastBlock = await this.#createGenesisBlock();
		}

		this.#configureState(lastBlock);
	}

	async #createGenesisBlock(): Promise<Contracts.Crypto.IBlock> {
		const genesisBlock = this.stateStore.getGenesisBlock();

		await this.databaseService.saveBlocks([genesisBlock]);

		return genesisBlock;
	}

	#configureState(lastBlock: Contracts.Crypto.IBlock): void {
		this.stateStore.setLastBlock(lastBlock);
	}

	// async #emitTransactionEvents(transaction: Contracts.Crypto.ITransaction): Promise<void> {
	// 	// eslint-disable-next-line @typescript-eslint/no-floating-promises
	// 	this.events.dispatch(Enums.TransactionEvent.Applied, transaction.data);
	// 	const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);
	// 	// ! no reason to pass this.emitter
	// 	handler.emitEvents(transaction, this.events);
	// }
}
