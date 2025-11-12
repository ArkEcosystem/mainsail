import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { InvalidTransactionsLength } from "@mainsail/exceptions";

@injectable()
export class TransactionLengthVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		if (block.transactions.length !== block.data.transactionsCount) {
			throw new InvalidTransactionsLength(block);
		}
	}
}
