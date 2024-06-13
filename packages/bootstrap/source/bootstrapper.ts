import { inject, injectable, optional } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

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

	@inject(Identifiers.State.Verifier)
	private readonly stateVerifier!: Contracts.State.StateVerifier;

	@inject(Identifiers.Validator.Repository)
	private readonly validatorRepository!: Contracts.Validator.ValidatorRepository;

	@inject(Identifiers.P2P.Server)
	private readonly p2pServer!: Contracts.P2P.Server;

	@inject(Identifiers.P2P.Service)
	private readonly p2pService!: Contracts.P2P.Service;

	@inject(Identifiers.Cryptography.Commit.Factory)
	private readonly commitFactory!: Contracts.Crypto.CommitFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.State.Service)
	private stateService!: Contracts.State.Service;

	@inject(Identifiers.State.Snapshot.Service)
	private snapshotService!: Contracts.State.SnapshotService;

	@inject(Identifiers.Processor.BlockProcessor)
	private readonly blockProcessor!: Contracts.Processor.BlockProcessor;

	@inject(Identifiers.Consensus.CommitState.Factory)
	private readonly commitStateFactory!: Contracts.Consensus.CommitStateFactory;

	@inject(Identifiers.ApiSync.Service)
	@optional()
	private readonly apiSync?: Contracts.ApiSync.Service;

	@inject(Identifiers.TransactionPool.Worker)
	private readonly txPoolWorker!: Contracts.TransactionPool.Worker;

	public async bootstrap(): Promise<void> {
		try {
			if (this.apiSync) {
				await this.apiSync.prepareBootstrap();
			}

			await this.#setGenesisCommit();
			await this.#checkStoredGenesisCommit();
			await this.#storeGenesisCommit();

			await this.#restoreSnapshots();

			if (this.apiSync) {
				await this.apiSync.bootstrap();
			}

			await this.#initState();

			await this.#processBlocks();
			this.state.setBootstrap(false);

			this.stateVerifier.verifyWalletsConsistency();

			this.validatorRepository.printLoadedValidators();

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

		this.stateService.getStore().setGenesisCommit(genesisBlock);
	}
	async #checkStoredGenesisCommit(): Promise<void> {
		const genesisCommit = await this.databaseService.getCommit(0);

		if (!genesisCommit) {
			return;
		}

		if (this.stateService.getStore().getGenesisCommit().block.data.id !== genesisCommit.block.data.id) {
			throw new Error("Block from crypto.json doesn't match stored genesis block");
		}
	}

	async #storeGenesisCommit(): Promise<void> {
		if (this.databaseService.isEmpty()) {
			const genesisBlock = this.stateService.getStore().getGenesisCommit();
			this.databaseService.addCommit(genesisBlock);
			await this.databaseService.persist();
		}
	}

	async #processGenesisBlock(): Promise<void> {
		const genesisBlock = this.stateService.getStore().getGenesisCommit();
		await this.#processCommit(genesisBlock);
	}

	async #restoreSnapshots(): Promise<void> {
		const lastCommit = await this.databaseService.getLastCommit();
		const ledgerHeight = lastCommit.block.data.height;

		let localSnapshots = await this.snapshotService.listSnapshots();
		localSnapshots = localSnapshots.filter((snapshot) => snapshot <= ledgerHeight);

		if (this.apiSync) {
			const apiSyncHeight = await this.apiSync.getLastSyncedBlockHeight();
			localSnapshots = localSnapshots.filter((snapshot) => snapshot <= apiSyncHeight);
		}

		const localSnapshotHeight = localSnapshots.shift();
		if (localSnapshotHeight) {
			await this.stateService.restore(localSnapshotHeight);
			await this.txPoolWorker.importSnapshot(localSnapshotHeight);
		} else {
			this.logger.info("Skipping snapshot restoration");
		}
	}

	async #initState(): Promise<void> {
		// The initial height is > 0 when restoring a snapshot.
		if (this.stateService.getStore().getLastHeight() === 0) {
			await this.#processGenesisBlock();
		} else {
			const commit = await this.databaseService.getCommit(this.stateService.getStore().getLastHeight());
			Utils.assert.defined<Contracts.Crypto.Commit>(commit);
			this.stateService.getStore().setLastBlock(commit.block);
			this.configuration.setHeight(commit.block.data.height + 1);

			this.validatorSet.restore(this.stateService.getStore());
		}
	}

	async #processBlocks(): Promise<void> {
		const lastCommit = await this.databaseService.getLastCommit();

		for await (const commit of this.databaseService.readCommits(
			this.stateService.getStore().getLastHeight() + 1,
			lastCommit.block.data.height,
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
				throw new Error(`Block is not processed.`);
			}
			commitState.setProcessorResult(result);
			await this.blockProcessor.commit(commitState);
		} catch (error) {
			await this.app.terminate(`Failed to process block at height ${commit.block.data.height}`, error);
		}
	}
}
