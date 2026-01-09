import type { Message, Proposal } from "../crypto/index.js";

export interface Broadcaster {
	broadcastProposal(proposal: Proposal): Promise<void>;
	broadcastMessage(message: Message): Promise<void>;
}
