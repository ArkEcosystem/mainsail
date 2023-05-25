import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class IncompatibleTransactionsVerifier implements Contracts.BlockProcessor.Handler {
	public async execute(roundState: Contracts.Consensus.IRoundState): Promise<boolean> {
		const block = roundState.getProposal().toData().block;
		for (let index = 1; index < block.transactions.length; index++) {
			if (block.transactions[index].data.version !== block.transactions[0].data.version) {
				return false;
			}
		}

		return true;
	}
}
