import { inject, injectable, multiInject, optional, tagged } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class BlockProcessor implements Contracts.Processor.BlockProcessor {
	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.State.State)
	private readonly state!: Contracts.State.State;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Processor.TransactionProcessor)
	private readonly transactionProcessor!: Contracts.Processor.TransactionProcessor;

	@inject(Identifiers.Transaction.Handler.Registry)
	private handlerRegistry!: Contracts.Transactions.TransactionHandlerRegistry;

	@inject(Identifiers.Proposer.Selector)
	private readonly proposerSelector!: Contracts.Proposer.Selector;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.Processor.BlockVerifier)
	private readonly verifier!: Contracts.Processor.Verifier;

	@multiInject(Identifiers.State.ValidatorMutator)
	private readonly validatorMutators!: Contracts.State.ValidatorMutator[];

	@inject(Identifiers.TransactionPool.Worker)
	private readonly txPoolWorker!: Contracts.TransactionPool.Worker;

	@inject(Identifiers.ApiSync.Service)
	@optional()
	private readonly apiSync?: Contracts.ApiSync.Service;

	public async process(unit: Contracts.Processor.ProcessableUnit): Promise<Contracts.Processor.BlockProcessorResult> {
		const processResult = { gasUsed: 0, receipts: new Map(), success: false };

		try {
			const block = unit.getBlock();

			await this.verifier.verify(unit);

			for (const [index, transaction] of unit.getBlock().transactions.entries()) {
				if (index % 20 === 0) {
					await Utils.sleep(0);
				}

				const { gasUsed, receipt } = await this.transactionProcessor.process(unit, transaction);
				processResult.receipts.set(transaction.id, receipt);

				transaction.data.gasUsed = gasUsed;
				this.#consumeGas(block, processResult, gasUsed);
			}

			this.#verifyConsumedAllGas(block, processResult);
			await this.#verifyStateHash(block);
			await this.#applyBlockToForger(unit);

			processResult.success = true;
		} catch (error) {
			void this.#emit(Events.BlockEvent.Invalid, { block: unit.getBlock().data, error });
			this.logger.error(`Cannot process block because: ${error.message}`);
		}

		return processResult;
	}

	public async commit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (this.apiSync) {
			await this.apiSync.beforeCommit();
		}

		const commit = await unit.getCommit();

		if (!this.state.isBootstrap()) {
			this.databaseService.addCommit(commit);

			if (unit.persist) {
				await this.databaseService.persist();
			}
		}

		this.#setConfigurationHeight(unit);
		await unit.store.onCommit(unit);
		await this.validatorSet.onCommit(unit);
		await this.proposerSelector.onCommit(unit);
		await this.stateService.onCommit(unit);
		await this.evm.onCommit(unit);
		await this.txPoolWorker.onCommit(unit);

		if (this.apiSync) {
			await this.apiSync.onCommit(unit);
		}

		for (const transaction of unit.getBlock().transactions) {
			await this.#emitTransactionEvents(transaction);
		}

		this.#logBlockCommitted(unit);
		this.#logNewRound(unit);

		void this.#emit(Events.BlockEvent.Applied, commit.block.data);
	}

	#logBlockCommitted(unit: Contracts.Processor.ProcessableUnit): void {
		if (!this.state.isBootstrap()) {
			const block = unit.getBlock();
			this.logger.info(
				`Block ${unit.height.toLocaleString()}/${unit.round.toLocaleString()} with ${block.data.numberOfTransactions.toLocaleString()} tx(s) committed (gasUsed=${block.data.totalGasUsed.toLocaleString()})`,
			);
		}
	}

	#logNewRound(unit: Contracts.Processor.ProcessableUnit): void {
		const height = unit.getBlock().data.height;
		if (Utils.roundCalculator.isNewRound(height + 1, this.configuration)) {
			const roundInfo = Utils.roundCalculator.calculateRound(height + 1, this.configuration);

			if (!this.state.isBootstrap()) {
				this.logger.debug(
					`Starting validator round ${roundInfo.round} at height ${roundInfo.roundHeight} with ${roundInfo.maxValidators} validators`,
				);
			}
		}
	}

	#setConfigurationHeight(unit: Contracts.Processor.ProcessableUnit): void {
		// NOTE: The configuration is always set to the next height. To height which is going to be proposed.
		this.configuration.setHeight(unit.height + 1);

		if (this.configuration.isNewMilestone()) {
			this.logger.notice(`Milestone change: ${JSON.stringify(this.configuration.getMilestoneDiff())}`);

			void this.#emit(Events.CryptoEvent.MilestoneChanged);
		}
	}

	#consumeGas(
		block: Contracts.Crypto.Block,
		processorResult: Contracts.Processor.BlockProcessorResult,
		gasUsed: number,
	): void {
		const totalGas = block.header.totalGasUsed;

		if (processorResult.gasUsed + gasUsed > totalGas) {
			throw new Error("Cannot consume more gas");
		}

		processorResult.gasUsed += gasUsed;
	}

	#verifyConsumedAllGas(
		block: Contracts.Crypto.Block,
		processorResult: Contracts.Processor.BlockProcessorResult,
	): void {
		const totalGas = block.header.totalGasUsed;
		if (totalGas !== processorResult.gasUsed) {
			throw new Error("Consumed gas mismatch");
		}
	}

	async #verifyStateHash(block: Contracts.Crypto.Block): Promise<void> {
		if (block.header.height === 0) {
			return;
		}

		const previousBlock = this.stateService.getStore().getLastBlock();
		const stateHash = await this.evm.stateHash(previousBlock.header.stateHash);

		if (block.header.stateHash !== stateHash) {
			throw new Error(`State hash mismatch! ${block.header.stateHash} != ${stateHash}`);
		}
	}

	async #emitTransactionEvents(transaction: Contracts.Crypto.Transaction): Promise<void> {
		if (this.state.isBootstrap()) {
			return;
		}

		void this.#emit(Events.TransactionEvent.Applied, transaction.data);
		const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);
		handler.emitEvents(transaction);
	}

	async #applyBlockToForger(unit: Contracts.Processor.ProcessableUnit) {
		const block = unit.getBlock();
		const walletRepository = unit.store.walletRepository;

		const forgerWallet = await walletRepository.findByPublicKey(unit.getBlock().data.generatorPublicKey);

		for (const validatorMutator of this.validatorMutators) {
			await validatorMutator.apply(walletRepository, forgerWallet, block.data);
		}
	}

	async #emit<T>(event: Contracts.Kernel.EventName, data?: T): Promise<void> {
		if (this.state.isBootstrap()) {
			return;
		}

		return this.events.dispatch(event, data);
	}
}
