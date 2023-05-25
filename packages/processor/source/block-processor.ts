import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { AcceptBlockHandler } from "./handlers";
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

	public async process(roundState: Contracts.Consensus.IRoundState): Promise<boolean> {
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

		return this.app.resolve<AcceptBlockHandler>(AcceptBlockHandler).execute(roundState);
	}
}
