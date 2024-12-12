import { inject, injectable, optional } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Bootstrapper {
	@inject(Identifiers.Application.Instance)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Consensus.Service)
	private readonly consensus!: Contracts.Consensus.Service;

	@inject(Identifiers.State.State)
	private readonly state!: Contracts.State.State;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Validator.Repository)
	private readonly validatorRepository!: Contracts.Validator.ValidatorRepository;

	@inject(Identifiers.P2P.Server)
	private readonly p2pServer!: Contracts.P2P.Server;

	@inject(Identifiers.P2P.Service)
	private readonly p2pService!: Contracts.P2P.Service;

	@inject(Identifiers.Cryptography.Commit.Factory)
	private readonly commitFactory!: Contracts.Crypto.CommitFactory;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.State.Store)
	private stateStore!: Contracts.State.Store;

	@inject(Identifiers.Processor.BlockProcessor)
	private readonly blockProcessor!: Contracts.Processor.BlockProcessor;

	@inject(Identifiers.Consensus.CommitState.Factory)
	private readonly commitStateFactory!: Contracts.Consensus.CommitStateFactory;

	@inject(Identifiers.ApiSync.Service)
	@optional()
	private readonly apiSync?: Contracts.ApiSync.Service;

	@inject(Identifiers.Snapshot.Legacy.Importer)
	@optional()
	private readonly snapshotImporter?: Contracts.Snapshot.LegacyImporter;

	@inject(Identifiers.TransactionPool.Worker)
	private readonly txPoolWorker!: Contracts.TransactionPool.Worker;

	@inject(Identifiers.Evm.Worker)
	private readonly evmWorker!: Contracts.Evm.Worker;

	public async bootstrap(): Promise<void> {
		try {
			await this.#setGenesisCommit();
			await this.#checkStoredGenesisCommit();

			if (this.databaseService.isEmpty()) {
				await this.#initGenesisState();
			} else {
				await this.#initPostGenesisState();
			}

			this.state.setBootstrap(false);

			this.validatorRepository.printLoadedValidators();
			await this.txPoolWorker.start(this.stateStore.getHeight());
			await this.evmWorker.start(this.stateStore.getHeight());

			void this.runConsensus();

			await this.p2pServer.boot();
			await this.p2pService.boot();
		} catch (error) {
			this.logger.error(error.stack);
		}
	}

	async runConsensus(): Promise<void> {
		try {
			await this.consensus.run();
		} catch (error) {
			console.log(error);
		}
	}

	async #setGenesisCommit(): Promise<void> {
		const genesisBlockJson = this.configuration.get("genesisBlock");
		const genesisBlock = await this.commitFactory.fromJson(genesisBlockJson);

		this.stateStore.setGenesisCommit(genesisBlock);
	}

	async #checkStoredGenesisCommit(): Promise<void> {
		const genesisBlock = await this.databaseService.getBlock(0);

		if (!genesisBlock) {
			return;
		}

		if (this.stateStore.getGenesisCommit().block.data.id !== genesisBlock.data.id) {
			throw new Error("Block from crypto.json doesn't match stored genesis block");
		}
	}

	async #initApiSync(): Promise<void> {
		if (this.apiSync) {
			await this.apiSync.bootstrap();
		}
	}

	async #initGenesisState(): Promise<void> {
		if (!this.databaseService.isEmpty()) {
			throw new Error("initGenesisState must be called on empty database");
		}

		await this.#tryImportSnapshot();
		await this.#processGenesisBlock();
		await this.validatorSet.restore();

		// After genesis commit to restore all data
		await this.#initApiSync();
	}

	async #initPostGenesisState(): Promise<void> {
		await this.#initApiSync();

		const commit = await this.databaseService.getLastCommit();
		this.stateStore.setLastBlock(commit.block);
		this.stateStore.setTotalRound(this.databaseService.getState().totalRound);

		await this.validatorSet.restore();
	}

	async #processGenesisBlock(): Promise<void> {
		const genesisBlock = this.stateStore.getGenesisCommit();
		await this.#processCommit(genesisBlock);
		this.databaseService.addCommit(genesisBlock);
		await this.databaseService.persist();
	}

	async #processCommit(commit: Contracts.Crypto.Commit): Promise<void> {
		try {
			const commitState = this.commitStateFactory(commit);
			const result = await this.blockProcessor.process(commitState);
			if (!result.success) {
				throw new Error(`Block is not processed.`);
			}

			commitState.setProcessorResult(result);

			await this.blockProcessor.commit(commitState);
		} catch (error) {
			await this.app.terminate(`Failed to process block at height ${commit.block.data.height}`, error);
		}
	}

	async #tryImportSnapshot(): Promise<void> {
		const genesisBlock = this.stateStore.getGenesisCommit();
		const milestone = this.configuration.getMilestone(0);

		// assume snapshot is present if the previous block points to a non-zero hash
		if (
			genesisBlock.block.header.previousBlock ===
			"0000000000000000000000000000000000000000000000000000000000000000"
		) {
			if (milestone.snapshot) {
				throw new Error("previous block set to snapshot but no hash in milestone");
			}

			return;
		}

		if (!this.snapshotImporter) {
			throw new Error("snapshot importer not loaded");
		}

		await this.snapshotImporter.run(genesisBlock);
	}
}
