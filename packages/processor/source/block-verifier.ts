import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import {
	ChainedVerifier,
	ForgedTransactionsVerifier,
	IncompatibleTransactionsVerifier,
	NonceVerifier,
	ValidatorVerifier,
	VerifyBlockVerifier,
} from "./verifiers";
import { CommitVerifier } from "./verifiers/commit-verifier";

@injectable()
export class BlockVerifier implements Contracts.BlockProcessor.Verifier {

	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	public async verifyCommittedBlock(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<boolean> {
		if (!await this.verify(unit)) {
			return false;
		}

		// NOTE: We need the CommitVerifier when dealing with downloaded blocks.
		// The normal consensus flow already verifies each individual validator signature for the commit and
		// can therefore be skipped.
		if (!(await this.app.resolve(CommitVerifier).execute(unit))) {
			return false;
		}

		return true;
	}

	public async verify(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<boolean> {
		if (!(await this.app.resolve(VerifyBlockVerifier).execute(unit))) {
			return false;
		}

		// TODO: might not be needed 
		if (!(await this.app.resolve(IncompatibleTransactionsVerifier).execute(unit))) {
			return false;
		}

		if (!(await this.app.resolve(NonceVerifier).execute(unit))) {
			return false;
		}

		if (!(await this.app.resolve(ValidatorVerifier).execute(unit))) {
			return false;
		}

		if (!(await this.app.resolve(ChainedVerifier).execute(unit))) {
			return false;
		}

		if (!(await this.app.resolve(ForgedTransactionsVerifier).execute(unit))) {
			return false;
		}

		return true;
	}

}
