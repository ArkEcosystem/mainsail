import { IBlock, IPrecommit, IPrevote, IProposal, ITransaction } from "../crypto";

export interface Broadcaster {
	broadcastTransactions(transactions: ITransaction[]): Promise<void>;
	broadcastBlock(block: IBlock): Promise<void>;
	broadcastProposal(proposal: IProposal): Promise<void>;
	broadcastPrevote(prevote: IPrevote): Promise<void>;
	broadcastPrecommit(precommit: IPrecommit): Promise<void>;
}
