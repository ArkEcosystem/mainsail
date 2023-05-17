import { injectable } from "@mainsail/container";

import { Precommit } from "./precommit";
import { Prevote } from "./prevote";
import { Proposal } from "./proposal";
import { IBroadcaster } from "./types";

@injectable()
export class Broadcaster implements IBroadcaster {
	async broadcastProposal(proposal: Proposal): Promise<void> {}
	async broadcastPrevote(prevote: Prevote): Promise<void> {}
	async broadcastPrecommit(precommit: Precommit): Promise<void> {}
}
