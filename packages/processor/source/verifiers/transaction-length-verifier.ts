import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
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
