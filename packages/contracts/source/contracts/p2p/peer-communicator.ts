import {
	IGetBlocksResponse,
	IGetMessagesResponse,
	IGetPeersResponse,
	IGetProposalResponse,
	IGetStatusResponse,
} from "./endpoints";
import { Peer } from "./peer";

export interface PeerCommunicator {
	initialize();

	postTransactions(peer: Peer, transactions: Buffer[]): Promise<void>;
	postProposal(peer: Peer, proposal: Buffer): Promise<void>;
	postPrevote(peer: Peer, prevote: Buffer): Promise<void>;
	postPrecommit(peer: Peer, prevote: Buffer): Promise<void>;

	pingPorts(peer: Peer): Promise<void>;

	getPeers(peer: Peer): Promise<IGetPeersResponse>;
	getMessages(peer: Peer): Promise<IGetMessagesResponse>;
	getProposal(peer: Peer): Promise<IGetProposalResponse>;
	getBlocks(peer: Peer, { fromHeight, limit }: { fromHeight: number; limit?: number }): Promise<IGetBlocksResponse>;
	getStatus(peer: Peer): Promise<IGetStatusResponse>;

	hasCommonBlocks(peer: Peer, ids: string[], timeoutMsec?: number): Promise<any>;
}
