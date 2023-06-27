import { IPrecommit, IPrevote, IProposal, ITransaction } from "../crypto";

export interface Broadcaster {
	broadcastTransactions(transactions: ITransaction[]): Promise<void>;
	broadcastProposal(proposal: IProposal): Promise<void>;
	broadcastPrevote(prevote: IPrevote): Promise<void>;
	broadcastPrecommit(precommit: IPrecommit): Promise<void>;
}
