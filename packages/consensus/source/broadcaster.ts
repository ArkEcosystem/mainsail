import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class Broadcaster implements Contracts.Consensus.IBroadcaster {
	async broadcastProposal(proposal: Contracts.Crypto.IProposal): Promise<void> {}
	async broadcastPrevote(prevote: Contracts.Crypto.IPrevote): Promise<void> {}
	async broadcastPrecommit(precommit: Contracts.Crypto.IPrecommit): Promise<void> {}
}
