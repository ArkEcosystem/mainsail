import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { DuplicatedTransaction } from "@mainsail/exceptions";

@injectable()
export class TransactionDuplicatesVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		const appliedTransactions: Set<string> = new Set();
		for (const transaction of block.transactions) {
			if (appliedTransactions.has(transaction.hash)) {
				throw new DuplicatedTransaction(unit.getBlock(), transaction.hash);
			}

			appliedTransactions.add(transaction.hash);
		}
	}
}
