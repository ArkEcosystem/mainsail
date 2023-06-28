import { inject, injectable } from "@mainsail/container";
import { Constants, Contracts, Identifiers } from "@mainsail/contracts";
import { Enums } from "@mainsail/kernel";

@injectable()
export class DatabaseInteraction {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	public async initialize(): Promise<void> {
		try {
			await this.events.dispatch(Enums.StateEvent.Starting);

			const genesisBlockJson = this.configuration.get("genesisBlock");
			const genesisBlock = await this.blockFactory.fromCommittedJson(genesisBlockJson);

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

		await this.#configureState(lastBlock);
	}

	async #createGenesisBlock(): Promise<Contracts.Crypto.IBlock> {
		const genesisBlock = this.stateStore.getGenesisBlock();

		await this.databaseService.saveBlocks([genesisBlock]);

		return genesisBlock.block;
	}

	async #configureState(lastBlock: Contracts.Crypto.IBlock): Promise<void> {
		this.stateStore.setLastBlock(lastBlock);

		const lastCommittedRound = await this.databaseService.getCommittedRound(lastBlock.header.height);
		this.stateStore.setLastCommittedRound(lastCommittedRound);
	}
}
