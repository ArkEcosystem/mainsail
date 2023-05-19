import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { IBroadcaster } from "./types";

@injectable()
export class Broadcaster implements IBroadcaster {
	async broadcastProposal(proposal: Contracts.Crypto.IProposal): Promise<void> { }
	async broadcastPrevote(prevote: Contracts.Crypto.IPrevote): Promise<void> { }
	async broadcastPrecommit(precommit: Contracts.Crypto.IPrecommit): Promise<void> { }
}
