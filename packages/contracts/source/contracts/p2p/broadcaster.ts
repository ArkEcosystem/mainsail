import { Precommit, Prevote, Proposal, Transaction } from "../crypto";

export interface Broadcaster {
	broadcastTransactions(transactions: Transaction[]): Promise<void>;
	broadcastProposal(proposal: Proposal): Promise<void>;
	broadcastPrevote(prevote: Prevote): Promise<void>;
	broadcastPrecommit(precommit: Precommit): Promise<void>;
}
