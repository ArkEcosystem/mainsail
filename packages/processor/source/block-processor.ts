import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
// TODO: Move enums to contracts
import { Enums } from "@mainsail/kernel";

import {
	ForgedTransactionsVerifier,
	IncompatibleTransactionsVerifier,
	NonceVerifier,
	VerifyBlockVerifier,
} from "./verifiers";

@injectable()
export class BlockProcessor implements Contracts.BlockProcessor.Processor {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	@inject(Identifiers.BlockState)
	private readonly blockState!: Contracts.State.BlockState;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.IDatabaseService;

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

	public async process(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<boolean> {
		try {
			if (!(await this.#verify(unit))) {
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

		this.logger.info(`Block ${commitBlock.block.header.height.toLocaleString()} committed`);

		for (const transaction of commitBlock.block.transactions) {
			await this.#emitTransactionEvents(transaction);
		}

		void this.events.dispatch(Enums.BlockEvent.Applied, commitBlock);
	}

	async #verify(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<boolean> {
		if (!(await this.app.resolve(VerifyBlockVerifier).execute(unit))) {
			return false;
		}

		if (!(await this.app.resolve(IncompatibleTransactionsVerifier).execute(unit))) {
			return false;
		}

		if (!(await this.app.resolve(NonceVerifier).execute(unit))) {
			return false;
		}

		// if (!(await this.app.resolve(ValidatorVerifier).execute(roundState))) {
		// 	return false;
		// }

		// if (!(await this.app.resolve(ChainedVerifier).execute(roundState))) {
		// 	return false;
		// }

		if (!(await this.app.resolve(ForgedTransactionsVerifier).execute(unit))) {
			return false;
		}

		return true;
	}

	async #emitTransactionEvents(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		void this.events.dispatch(Enums.TransactionEvent.Applied, transaction.data);
		const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);
		// TODO: ! no reason to pass this.emitter
		handler.emitEvents(transaction, this.events);
	}
}
