import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import {
	ChainedVerifier,
	GeneratorVerifier,
	IncompatibleTransactionsVerifier,
	NonceVerifier,
	TimestampVerifier,
	VerifyBlockVerifier,
} from "./verifiers/index.js";

@injectable()
export class BlockVerifier implements Contracts.Processor.Verifier {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	public async verify(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		await this.app.resolve(ChainedVerifier).execute(unit);

		await this.app.resolve(TimestampVerifier).execute(unit);

		await this.app.resolve(GeneratorVerifier).execute(unit);

		await this.app.resolve(VerifyBlockVerifier).execute(unit);

		await this.app.resolve(IncompatibleTransactionsVerifier).execute(unit);

		await this.app.resolve(NonceVerifier).execute(unit);
	}
}
