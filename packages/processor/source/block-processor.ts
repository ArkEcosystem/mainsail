import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

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

	@inject(Identifiers.BlockState)
	private readonly blockState!: Contracts.State.BlockState;

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
}
