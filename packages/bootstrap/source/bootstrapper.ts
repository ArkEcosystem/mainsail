import { inject, injectable, optional, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class Bootstrapper {
	@inject(Identifiers.Application.Instance)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Kernel.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Consensus.Service)
	private readonly consensus!: Contracts.Consensus.ConsensusService;

	@inject(Identifiers.StateVerifier)
	private readonly stateVerifier!: Contracts.State.StateVerifier;

	@inject(Identifiers.TransactionPoolService)
	private readonly transactionPool!: Contracts.TransactionPool.Service;

	@inject(Identifiers.P2PServer)
	private readonly p2pServer!: Contracts.P2P.Server;

	@inject(Identifiers.P2P.Service)
	private readonly p2pService!: Contracts.P2P.Service;

	@inject(Identifiers.Cryptography.Commit.Factory)
	private readonly commitFactory!: Contracts.Crypto.CommitFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	@inject(Identifiers.StateService)
	private stateService!: Contracts.State.Service;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.ValidatorSet;

	@inject(Identifiers.BlockProcessor)
	private readonly blockProcessor!: Contracts.Processor.BlockProcessor;

	@inject(Identifiers.Consensus.CommitStateFactory)
	private readonly commitStateFactory!: Contracts.Consensus.CommitStateFactory;

	@inject(Identifiers.ApiSync)
	@optional()
	private readonly apiSync: Contracts.ApiSync.Sync | undefined;

	#stateStore!: Contracts.State.StateStore;

	@postConstruct()
	public initialize(): void {
		this.#stateStore = this.stateService.getStateStore();
	}

	public async bootstrap(): Promise<void> {
		try {
			if (this.apiSync) {
				await this.apiSync.prepareBootstrap();
			}

			await this.#setGenesisCommit();
			await this.#storeGenesisCommit();

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

	async #setGenesisCommit(): Promise<void> {
		const genesisBlockJson = this.configuration.get("genesisBlock");
		const genesisBlock = await this.commitFactory.fromJson(genesisBlockJson);

		this.#stateStore.setGenesisCommit(genesisBlock);
	}

	async #storeGenesisCommit(): Promise<void> {
		if (!(await this.databaseService.getLastBlock())) {
			const genesisBlock = this.#stateStore.getGenesisCommit();
			this.databaseService.addCommit(genesisBlock);
			await this.databaseService.persist();
		}
	}

	async #processGenesisBlock(): Promise<void> {
		const genesisBlock = this.#stateStore.getGenesisCommit();
		await this.#processCommit(genesisBlock);
	}

	async #restoreStateSnapshot(): Promise<void> {
		const lastBlock = await this.databaseService.getLastBlock();
		let restoreHeight = lastBlock?.data?.height ?? 0;
		if (this.apiSync) {
			restoreHeight = Math.min(await this.apiSync.getLastSyncedBlockHeight(), restoreHeight);
		}

		await this.stateService.restore(restoreHeight);
	}

	async #initState(): Promise<void> {
		// The initial height is > 0 when restoring a snapshot.
		if (this.#stateStore.getLastHeight() === 0) {
			await this.#processGenesisBlock();
		} else {
			const block = await this.databaseService.getBlock(this.#stateStore.getLastHeight());
			Utils.assert.defined<Contracts.Crypto.Block>(block);
			this.#stateStore.setLastBlock(block);
		}
	}

	async #processBlocks(): Promise<void> {
		const lastBlock = await this.databaseService.getLastBlock();
		Utils.assert.defined<Contracts.Crypto.Commit>(lastBlock);

		for await (const commit of this.databaseService.readCommits(
			this.#stateStore.getLastHeight() + 1,
			lastBlock.data.height,
		)) {
			await this.#processCommit(commit);

			if (commit.block.data.height % 10_000 === 0) {
				this.logger.info(`Processed blocks: ${commit.block.data.height.toLocaleString()} `);

				await new Promise<void>((resolve) => setImmediate(resolve)); // Log might stuck if this line is removed
			}
		}
	}

	async #processCommit(commit: Contracts.Crypto.Commit): Promise<void> {
		try {
			const commitState = this.commitStateFactory(commit);
			const result = await this.blockProcessor.process(commitState);
			if (result === false) {
				throw new Error(`Cannot process block`);
			}
			await this.blockProcessor.commit(commitState);
		} catch (error) {
			await this.app.terminate(`Failed to process block at height ${commit.block.data.height}: ${error.message}`);
		}
	}
}
