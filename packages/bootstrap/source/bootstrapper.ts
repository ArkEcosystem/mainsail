import { inject, injectable, tagged } from "@mainsail/container";
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

	@inject(Identifiers.P2P.Service)
	private readonly p2pService!: Contracts.P2P.Service;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.Consensus.ProposerPicker)
	private readonly proposerPicker!: Contracts.Consensus.IProposerPicker;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.BlockProcessor)
	private readonly blockProcessor!: Contracts.BlockProcessor.Processor;

	@inject(Identifiers.Consensus.CommittedBlockStateFactory)
	private readonly committedBlockStateFactory!: Contracts.Consensus.ICommittedBlockStateFactory;

	public async bootstrap(): Promise<void> {
		try {
			await this.#setGenesisBlock();
			await this.#storeGenesisBlock();
			await this.#processGenesisBlock();

			await this.#initState();

			await this.#processBlocks();
			this.stateStore.setBootstrap(false);

			this.stateVerifier.verifyWalletsConsistency();

			await this.transactionPool.readdTransactions();

			void this.consensus.run();

			await this.p2pService.boot();
		} catch (error) {
			this.logger.error(error.stack);
		}
	}

	async #setGenesisBlock(): Promise<void> {
		const genesisBlockJson = this.configuration.get("genesisBlock");
		const genesisBlock = await this.blockFactory.fromCommittedJson(genesisBlockJson);

		this.stateStore.setGenesisBlock(genesisBlock);
		this.stateStore.setLastBlock(genesisBlock.block);
	}

	async #storeGenesisBlock(): Promise<void> {
		if (!(await this.databaseService.getLastBlock())) {
			const genesisBlock = this.stateStore.getGenesisBlock();
			await this.databaseService.saveBlocks([genesisBlock]);
		}
	}

	async #processGenesisBlock(): Promise<void> {
		const registeredHandlers = this.app
			.getTagged<Contracts.Transactions.ITransactionHandlerRegistry>(
				Identifiers.TransactionHandlerRegistry,
				"state",
				"blockchain",
			)
			.getRegisteredHandlers();

		const genesisBlock = this.stateStore.getGenesisBlock();
		for (const handler of registeredHandlers.values()) {
			await handler.bootstrap(this.walletRepository, genesisBlock.block.transactions);
		}
	}

	async #initState(): Promise<void> {
		await this.validatorSet.initialize();

		const committedBlockState = this.committedBlockStateFactory(this.stateStore.getGenesisBlock());
		await this.proposerPicker.onCommit(committedBlockState);
	}

	async #processBlocks(): Promise<void> {
		const lastBlock = await this.databaseService.getLastBlock();
		Utils.assert.defined<Contracts.Crypto.ICommittedBlock>(lastBlock);

		for await (const committedBlock of this.databaseService.readCommittedBlocksByHeight(1, lastBlock.data.height)) {
			const committedBlockState = this.committedBlockStateFactory(committedBlock);
			const result = await this.blockProcessor.process(committedBlockState);
			if (result === false) {
				// TODO: Handle block processing failure
				this.logger.critical(`Cannot process block: ${committedBlock.block.data.height}`);
				return;
			}
			await this.blockProcessor.commit(committedBlockState);
		}
	}
}
