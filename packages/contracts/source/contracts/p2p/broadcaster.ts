import { Precommit, Prevote, Proposal } from "../crypto/index.js";

export interface Broadcaster {
	broadcastProposal(proposal: Proposal): Promise<void>;
	broadcastPrevote(prevote: Prevote): Promise<void>;
	broadcastPrecommit(precommit: Precommit): Promise<void>;
}
