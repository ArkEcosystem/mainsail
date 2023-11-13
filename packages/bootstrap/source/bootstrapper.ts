import { inject, injectable, optional, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class Bootstrapper {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Consensus.Service)
	private readonly consensus!: Contracts.Consensus.IConsensusService;

	@inject(Identifiers.StateVerifier)
	private readonly stateVerifier!: Contracts.State.StateVerifier;

	@inject(Identifiers.TransactionPoolService)
	private readonly transactionPool!: Contracts.TransactionPool.Service;

	@inject(Identifiers.P2PServer)
	private readonly p2pServer!: Contracts.P2P.Server;

	@inject(Identifiers.P2P.Service)
	private readonly p2pService!: Contracts.P2P.Service;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.StateService)
	private stateService!: Contracts.State.Service;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.BlockProcessor)
	private readonly blockProcessor!: Contracts.BlockProcessor.Processor;

	@inject(Identifiers.Consensus.CommittedBlockStateFactory)
	private readonly committedBlockStateFactory!: Contracts.Consensus.ICommittedBlockStateFactory;

	@inject(Identifiers.ApiSync)
	@optional()
	private readonly apiSync: Contracts.ApiSync.ISync | undefined;

	#stateStore!: Contracts.State.StateStore;

	@postConstruct()
	public initialize(): void {
		this.#stateStore = this.stateService.getStateStore();
	}

	public async bootstrap(): Promise<void> {
		try {
			await this.#setGenesisBlock();
			await this.#storeGenesisBlock();

			await this.#restoreStateSnapshot();

			if (this.apiSync) {
				await this.apiSync.bootstrap();
			}

			await this.#initState();

			await this.validatorSet.initialize();

			await this.#processBlocks();
			this.#stateStore.setBootstrap(false);

			this.stateVerifier.verifyWalletsConsistency();

			await this.transactionPool.reAddTransactions();

			void this.consensus.run();

			await this.p2pServer.boot();
			await this.p2pService.boot();
		} catch (error) {
			this.logger.error(error.stack);
		}
	}

	async #setGenesisBlock(): Promise<void> {
		const genesisBlockJson = this.configuration.get("genesisBlock");
		const genesisBlock = await this.blockFactory.fromCommittedJson(genesisBlockJson);

		this.#stateStore.setGenesisBlock(genesisBlock);
	}

	async #storeGenesisBlock(): Promise<void> {
		if (!(await this.databaseService.getLastBlock())) {
			const genesisBlock = this.#stateStore.getGenesisBlock();
			await this.databaseService.saveBlocks([genesisBlock]);
		}
	}

	async #processGenesisBlock(): Promise<void> {
		const genesisBlock = this.#stateStore.getGenesisBlock();
		await this.#processBlock(genesisBlock);
	}

	async #restoreStateSnapshot(): Promise<void> {
		const lastBlock = await this.databaseService.getLastBlock();
		await this.stateService.restore(lastBlock?.data?.height ?? 0);
	}

	async #initState(): Promise<void> {
		// The initial height is > 0 when restoring a snapshot.
		if (this.#stateStore.getLastHeight() === 0) {
			await this.#processGenesisBlock();
		} else {
			const block = await this.databaseService.getBlockByHeight(this.#stateStore.getLastHeight());
			Utils.assert.defined<Contracts.Crypto.IBlock>(block);
			this.#stateStore.setLastBlock(block);
		}
	}

	async #processBlocks(): Promise<void> {
		const lastBlock = await this.databaseService.getLastBlock();
		Utils.assert.defined<Contracts.Crypto.ICommittedBlock>(lastBlock);

		for await (const committedBlock of this.databaseService.readCommittedBlocksByHeight(
			this.#stateStore.getLastHeight() + 1,
			lastBlock.data.height,
		)) {
			await this.#processBlock(committedBlock);

			if (committedBlock.block.data.height % 10_000 === 0) {
				this.logger.info(`Processed blocks: ${committedBlock.block.data.height.toLocaleString()} `);

				await new Promise<void>((resolve) => setImmediate(resolve)); // Log might stuck if this line is removed
			}
		}
	}

	async #processBlock(committedBlock: Contracts.Crypto.ICommittedBlock): Promise<void> {
		try {
			const committedBlockState = this.committedBlockStateFactory(committedBlock);
			const result = await this.blockProcessor.process(committedBlockState);
			if (result === false) {
				throw new Error(`Cannot process block`);
			}
			await this.blockProcessor.commit(committedBlockState);
		} catch (error) {
			await this.app.terminate(
				`Failed to process block at height ${committedBlock.block.data.height}: ${error.message}`,
			);
		}
	}
}
