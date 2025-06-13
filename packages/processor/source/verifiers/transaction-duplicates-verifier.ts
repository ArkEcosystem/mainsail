import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class TransactionDuplicatesVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		const appliedTransactions: Set<string> = new Set();
		for (const transaction of block.transactions) {
			if (appliedTransactions.has(transaction.hash)) {
				throw new Exceptions.DuplicatedTransaction(unit.getBlock(), transaction.hash);
			}

			appliedTransactions.add(transaction.hash);
		}
	}
}
