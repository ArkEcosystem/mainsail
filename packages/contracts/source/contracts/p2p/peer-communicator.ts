import { IBlock, IBlockData } from "../crypto";
import { IGetMessagesResponse, IGetPeersResponse, IGetProposalResponse } from "./endpoints";
import { Peer } from "./peer";

export interface PeerCommunicator {
	initialize();

	postBlock(peer: Peer, block: IBlock): Promise<void>;
	postTransactions(peer: Peer, transactions: Buffer[]): Promise<void>;
	postProposal(peer: Peer, proposal: Buffer): Promise<void>;
	postPrevote(peer: Peer, prevote: Buffer): Promise<void>;
	postPrecommit(peer: Peer, prevote: Buffer): Promise<void>;

	ping(peer: Peer, timeoutMsec: number, force?: boolean): Promise<any>;

	pingPorts(peer: Peer): Promise<void>;

	getPeers(peer: Peer): Promise<IGetPeersResponse>;
	getMessages(peer: Peer): Promise<IGetMessagesResponse>;
	getProposal(peer: Peer): Promise<IGetProposalResponse>;

	hasCommonBlocks(peer: Peer, ids: string[], timeoutMsec?: number): Promise<any>;

	getPeerBlocks(
		peer: Peer,
		{
			fromBlockHeight,
			blockLimit,
			headersOnly,
		}: { fromBlockHeight: number; blockLimit?: number; headersOnly?: boolean },
	): Promise<IBlockData[]>;
}
