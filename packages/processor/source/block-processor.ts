import { inject, injectable, multiInject, optional } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
// TODO: Move enums to contracts
import { Enums, Utils } from "@mainsail/kernel";

@injectable()
export class BlockProcessor implements Contracts.Processor.BlockProcessor {
	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.TransactionPoolService)
	private readonly transactionPool!: Contracts.TransactionPool.Service;

	@inject(Identifiers.TransactionProcessor)
	private readonly transactionProcessor!: Contracts.Processor.TransactionProcessor;

	@inject(Identifiers.TransactionHandlerRegistry)
	private handlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

	@inject(Identifiers.Proposer.Selector)
	private readonly proposerSelector!: Contracts.Proposer.ProposerSelector;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.BlockVerifier)
	private readonly verifier!: Contracts.Processor.Verifier;

	@multiInject(Identifiers.State.ValidatorMutator)
	private readonly validatorMutators!: Contracts.State.ValidatorMutator[];

	@inject(Identifiers.ApiSync)
	@optional()
	private readonly apiSync: Contracts.ApiSync.ISync | undefined;

	public async process(unit: Contracts.Processor.IProcessableUnit): Promise<boolean> {
		try {
			if (!(await this.verifier.verify(unit))) {
				return false;
			}

			for (const transaction of unit.getBlock().transactions) {
				await this.transactionProcessor.process(unit.getWalletRepository(), transaction);
			}

			await this.#applyBlockToForger(unit);

			return true;
		} catch (error) {
			this.logger.error(`Cannot process block, because: ${error.message}`);
		}

		return false;
	}

	public async commit(unit: Contracts.Processor.IProcessableUnit): Promise<void> {
		if (this.apiSync) {
			await this.apiSync.beforeCommit();
		}

		unit.getWalletRepository().commitChanges();

		const committedBlock = await unit.getCommittedBlock();

		const stateStore = this.stateService.getStateStore();
		if (!stateStore.isBootstrap()) {
			this.databaseService.addCommit(committedBlock);

			if (unit.persist) {
				await this.databaseService.persist();
			}
		}

		stateStore.setTotalRound(stateStore.getTotalRound() + unit.round + 1);
		stateStore.setLastBlock(committedBlock.block);

		await this.validatorSet.onCommit(unit);
		await this.proposerSelector.onCommit(unit);
		await this.stateService.onCommit(unit);

		if (this.apiSync) {
			await this.apiSync.onCommit(unit);
		}

		if (!stateStore.isBootstrap()) {
			this.logger.info(
				`Block ${committedBlock.block.header.height.toLocaleString()} with ${committedBlock.block.header.numberOfTransactions.toLocaleString()} tx(s) committed`,
			);
		}

		if (Utils.roundCalculator.isNewRound(committedBlock.block.header.height + 1, this.cryptoConfiguration)) {
			const roundInfo = Utils.roundCalculator.calculateRound(
				committedBlock.block.header.height + 1,
				this.cryptoConfiguration,
			);

			if (!stateStore.isBootstrap()) {
				this.logger.debug(
					`Starting validator round ${roundInfo.round} at height ${roundInfo.roundHeight} with ${roundInfo.maxValidators} validators`,
				);
			}
		}

		for (const transaction of committedBlock.block.transactions) {
			await this.transactionPool.removeForgedTransaction(transaction);
			await this.#emitTransactionEvents(transaction);
		}

		void this.events.dispatch(Enums.BlockEvent.Applied, committedBlock);
	}

	async #emitTransactionEvents(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		void this.events.dispatch(Enums.TransactionEvent.Applied, transaction.data);
		const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);
		// TODO: ! no reason to pass this.emitter
		handler.emitEvents(transaction, this.events);
	}

	async #applyBlockToForger(unit: Contracts.Processor.IProcessableUnit) {
		const block = unit.getBlock();
		const walletRepository = unit.getWalletRepository();

		const forgerWallet = await walletRepository.findByPublicKey(unit.getBlock().data.generatorPublicKey);

		for (const validatorMutator of this.validatorMutators) {
			await validatorMutator.apply(walletRepository, forgerWallet, block.data);
		}
	}
}
