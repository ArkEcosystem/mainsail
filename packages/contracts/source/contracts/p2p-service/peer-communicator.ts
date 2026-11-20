import type {
	GetBlocksResponse,
	GetMessagesQuery,
	GetMessagesResponse,
	GetPeersResponse,
	GetProposalQuery,
	GetProposalResponse,
	GetStatusResponse,
} from "./endpoints.js";
import type { Peer } from "./peer.js";

export interface PeerCommunicator {
	postProposal(peer: Peer, proposal: Buffer): Promise<void>;
	postMessage(peer: Peer, message: Buffer): Promise<void>;

	getPeers(peer: Peer): Promise<GetPeersResponse>;
	getMessages(peer: Peer, query: GetMessagesQuery): Promise<GetMessagesResponse>;
	getProposal(peer: Peer, query: GetProposalQuery): Promise<GetProposalResponse>;
	getBlocks(
		peer: Peer,
		{ fromBlockNumber, limit }: { fromBlockNumber: number; limit?: number },
	): Promise<GetBlocksResponse>;
	getStatus(peer: Peer): Promise<GetStatusResponse>;
}
