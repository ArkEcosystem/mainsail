import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";
import { DuplicatedTransaction } from "@mainsail/exceptions";

@injectable()
export class TransactionDuplicatesVerifier implements Contracts.Processor.Handler {
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
