import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class IncompatibleTransactionsVerifier implements Contracts.BlockProcessor.Handler {
	public async execute(roundState: Contracts.Consensus.IRoundState): Promise<boolean> {
		const proposedBlock = roundState.getProposal()?.block;
		Utils.assert.defined<Contracts.Crypto.IProposedBlock>(proposedBlock);

		const { block } = proposedBlock;

		for (let index = 1; index < block.transactions.length; index++) {
			if (block.transactions[index].data.version !== block.transactions[0].data.version) {
				return false;
			}
		}

		return true;
	}
}
