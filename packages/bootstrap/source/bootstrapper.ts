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

	// @inject(Identifiers.ValidatorSet.Service)
	// private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.State.Service)
	private stateService!: Contracts.State.Service;

	@inject(Identifiers.Processor.BlockProcessor)
	private readonly blockProcessor!: Contracts.Processor.BlockProcessor;

	@inject(Identifiers.Consensus.CommitState.Factory)
	private readonly commitStateFactory!: Contracts.Consensus.CommitStateFactory;

	@inject(Identifiers.ApiSync.Service)
	@optional()
	private readonly apiSync?: Contracts.ApiSync.Service;

	@inject(Identifiers.TransactionPool.Worker)
	private readonly txPoolWorker!: Contracts.TransactionPool.Worker;

	// @inject(Identifiers.Evm.Worker)
	// private readonly evmWorker!: Contracts.Evm.Worker;

	public async bootstrap(): Promise<void> {
		try {
			if (this.apiSync) {
				await this.apiSync.prepareBootstrap();
			}

			// await this.#restoreSnapshots();

			await this.#setGenesisCommit();
			await this.#checkStoredGenesisCommit();

			// if (this.apiSync) {
			// 	await this.apiSync.bootstrap();
			// }

			await this.#initState();

			this.state.setBootstrap(false);

			this.stateVerifier.verifyWalletsConsistency();
			this.validatorRepository.printLoadedValidators();
			await this.txPoolWorker.start();

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

	async #initState(): Promise<void> {
		if(this.databaseService.isEmpty()) {
			await this.#processGenesisBlock();
		}

		const commit = await this.databaseService.getLastCommit();
		this.stateService.getStore().setLastBlock(commit.block);



		// // The initial height is > 0 when restoring a snapshot.
		// if (this.stateService.getStore().getLastHeight() === 0) {
		// 	await this.#processGenesisBlock();
		// } else {
		// 	const commit = await this.databaseService.getCommit(this.stateService.getStore().getLastHeight());
		// 	Utils.assert.defined<Contracts.Crypto.Commit>(commit);
		// 	this.stateService.getStore().setLastBlock(commit.block);
		// 	this.configuration.setHeight(commit.block.data.height + 1);

		// 	this.validatorSet.restore(this.stateService.getStore());
		// }
	}

	async #processGenesisBlock(): Promise<void> {
		const genesisBlock = this.stateService.getStore().getGenesisCommit();
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
}
