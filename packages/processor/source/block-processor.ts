import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
// TODO: Move enums to contracts
import { Enums } from "@mainsail/kernel";

import {
	ChainedVerifier,
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
	private readonly state: Contracts.State.StateStore;

	@inject(Identifiers.BlockState)
	private readonly blockState!: Contracts.State.BlockState;

	@inject(Identifiers.Database.Service)
	private readonly databaseService: Contracts.Database.IDatabaseService;

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

			await this.blockState.applyBlock(roundState.getWalletRepository(), roundState.getProposal().toData().block);

			return true;
		} catch (error) {
			this.logger.error(`Cannot process block, because: ${error.message}`);
		}

		return false;
	}

	public async commit(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		// TODO Commit changes
		roundState.getWalletRepository();

		const block = roundState.getProposal().toData().block;

		// TODO: Save commitBlock
		await this.databaseService.saveBlocks([block]);

		this.state.setLastBlock(block);

		this.logger.info(`Block ${block.data.height.toLocaleString()} committed`);

		for (const transaction of block.transactions) {
			await this.#emitTransactionEvents(transaction);
		}

		void this.events.dispatch(Enums.BlockEvent.Applied, block.data);
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

		if (!(await this.app.resolve(ChainedVerifier).execute(roundState))) {
			return false;
		}

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
