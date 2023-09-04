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
export class BlockVerifier implements Contracts.BlockProcessor.Verifier {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	public async verify(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<boolean> {
		if (!(await this.app.resolve(ChainedVerifier).execute(unit))) {
			return false;
		}

		if (!(await this.app.resolve(VerifyBlockVerifier).execute(unit))) {
			return false;
		}

		if (!(await this.app.resolve(IncompatibleTransactionsVerifier).execute(unit))) {
			return false;
		}

		if (!(await this.app.resolve(NonceVerifier).execute(unit))) {
			return false;
		}

		if (!(await this.app.resolve(ForgedTransactionsVerifier).execute(unit))) {
			return false;
		}

		return true;
	}
}
