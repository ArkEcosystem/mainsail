import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";
import { InvalidTransactionsLength } from "@mainsail/exceptions";

@injectable()
export class TransactionLengthVerifier implements Contracts.Processor.Handler {
	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		if (block.transactions.length !== block.transactionsCount) {
			throw new InvalidTransactionsLength(block);
		}
	}
}
