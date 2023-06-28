import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
// TODO: Move enums to contracts
import { Enums, Utils } from "@mainsail/kernel";

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

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async process(roundState: Contracts.Consensus.IRoundState): Promise<boolean> {
		try {
			if (!(await this.#verify(roundState))) {
				return false;
			}

			const proposedBlock = roundState.getProposal()?.block;
			Utils.assert.defined<Contracts.Crypto.IProposedBlock>(proposedBlock);

			const { block } = proposedBlock;
			await this.blockState.applyBlock(roundState.getWalletRepository(), block);

			return true;
		} catch (error) {
			this.logger.error(`Cannot process block, because: ${error.message}`);
		}

		return false;
	}

	public async commit(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		roundState.getWalletRepository().commitChanges();

		const commitBlock = await roundState.getProposedCommitBlock();
		await this.databaseService.saveBlocks([commitBlock]);

		const lastCommittedRound = await this.databaseService.updateCommittedRound(commitBlock.block.header.height, roundState.round);

		this.state.setLastCommittedRound(lastCommittedRound);

		this.state.setLastBlock(commitBlock.block);

		this.logger.info(`Block ${commitBlock.block.header.height.toLocaleString()} committed`);

		for (const transaction of commitBlock.block.transactions) {
			await this.#emitTransactionEvents(transaction);
		}

		void this.events.dispatch(Enums.BlockEvent.Applied, commitBlock);
	}

	async #verify(roundState: Contracts.Consensus.IRoundState): Promise<boolean> {
		if (!(await this.app.resolve(VerifyBlockVerifier).execute(roundState))) {
			return false;
		}

		if (!(await this.app.resolve(IncompatibleTransactionsVerifier).execute(roundState))) {
			return false;
		}

		if (!(await this.app.resolve(NonceVerifier).execute(roundState))) {
			return false;
		}

		// if (!(await this.app.resolve(ValidatorVerifier).execute(roundState))) {
		// 	return false;
		// }

		// if (!(await this.app.resolve(ChainedVerifier).execute(roundState))) {
		// 	return false;
		// }

		if (!(await this.app.resolve(ForgedTransactionsVerifier).execute(roundState))) {
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
