import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import {
	ChainedVerifier,
	GeneratorVerifier,
	IncompatibleTransactionsVerifier,
	NonceVerifier,
	TimestampVerifier,
	VerifyBlockVerifier,
} from "./verifiers";

@injectable()
export class BlockVerifier implements Contracts.Processor.Verifier {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	public async verify(unit: Contracts.Processor.ProcessableUnit): Promise<boolean> {
		if (!(await this.app.resolve(ChainedVerifier).execute(unit))) {
			return false;
		}

		if (!(await this.app.resolve(TimestampVerifier).execute(unit))) {
			return false;
		}

		if (!(await this.app.resolve(GeneratorVerifier).execute(unit))) {
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

		return true;
	}
}
