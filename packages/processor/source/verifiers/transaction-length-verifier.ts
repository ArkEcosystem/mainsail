import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class TransactionLengthVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		if (block.transactions.length !== block.data.transactionsCount) {
			throw new Exceptions.InvalidTransactionsLength(block);
		}

		if (block.data.number === this.configuration.getGenesisHeight()) {
			return;
		}

		const maxTransactions = this.configuration.getMilestone().block.maxTransactions;

		if (block.data.transactionsCount > maxTransactions) {
			throw new Exceptions.MaxTransactionsExceeded(block);
		}
	}
}
