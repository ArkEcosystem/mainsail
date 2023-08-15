import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
// TODO: Move enums to contracts
import { Enums } from "@mainsail/kernel";

@injectable()
export class BlockProcessor implements Contracts.BlockProcessor.Processor {
	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	@inject(Identifiers.BlockState)
	private readonly blockState!: Contracts.State.BlockState;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.TransactionPoolService)
	private readonly transactionPool!: Contracts.TransactionPool.Service;

	@inject(Identifiers.TransactionHandlerRegistry)
	private handlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

	@inject(Identifiers.Consensus.ProposerPicker)
	private readonly proposerPicker!: Contracts.Consensus.IProposerPicker;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.BlockVerifier)
	private readonly verifier!: Contracts.BlockProcessor.Verifier;

	public async process(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<boolean> {
		try {
			if (!(await this.verifier.verify(unit))) {
				return false;
			}

			await this.blockState.applyBlock(unit.getWalletRepository(), unit.getBlock());

			return true;
		} catch (error) {
			this.logger.error(`Cannot process block, because: ${error.message}`);
		}

		return false;
	}

	public async commit(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<void> {
		unit.getWalletRepository().commitChanges();

		const commitBlock = await unit.getProposedCommitBlock();
		await this.databaseService.saveBlocks([commitBlock]);

		await this.validatorSet.handleCommitBlock(commitBlock);

		const committedRound = this.state.getLastCommittedRound();
		this.state.setLastCommittedRound(committedRound + unit.round + 1);

		this.state.setLastBlock(commitBlock.block);

		this.proposerPicker.handleCommittedBlock(commitBlock.commit);

		this.logger.info(
			`Block ${commitBlock.block.header.height.toLocaleString()} with ${commitBlock.block.header.numberOfTransactions.toLocaleString()} tx(s) committed`,
		);

		for (const transaction of commitBlock.block.transactions) {
			await this.transactionPool.removeForgedTransaction(transaction);
			await this.#emitTransactionEvents(transaction);
		}

		void this.events.dispatch(Enums.BlockEvent.Applied, commitBlock);
	}

	async #emitTransactionEvents(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		void this.events.dispatch(Enums.TransactionEvent.Applied, transaction.data);
		const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);
		// TODO: ! no reason to pass this.emitter
		handler.emitEvents(transaction, this.events);
	}
}
