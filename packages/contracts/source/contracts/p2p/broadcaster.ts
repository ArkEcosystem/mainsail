import type { Message, Proposal } from "../crypto/index.js";

export interface Broadcaster {
	broadcastProposal(proposal: Proposal): Promise<void>;
	broadcastPrevote(prevote: Message): Promise<void>;
	broadcastPrecommit(precommit: Message): Promise<void>;
}
