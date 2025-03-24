import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class TransactionLengthVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (unit.getBlock().data.number === this.configuration.getGenesisHeight()) {
			return;
		}

		const maxTransactions = this.configuration.getMilestone().block.maxTransactions;

		if (unit.getBlock().data.transactionsCount > maxTransactions) {
			throw new Exceptions.InvalidBlockTransactionLength(unit.getBlock());
		}
	}
}
