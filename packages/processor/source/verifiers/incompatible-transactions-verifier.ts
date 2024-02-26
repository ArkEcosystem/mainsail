import { injectable } from "@mainsail/container";
import { Contracts, Exceptions } from "@mainsail/contracts";

@injectable()
export class IncompatibleTransactionsVerifier implements Contracts.Processor.Handler {
	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		for (let index = 1; index < block.transactions.length; index++) {
			if (block.transactions[index].data.version !== block.transactions[0].data.version) {
				throw new Exceptions.IncompatibleTransactions(block);
			}
		}
	}
}
