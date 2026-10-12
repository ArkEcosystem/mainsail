import type {
	GetApiNodesResponse,
	GetBlocksResponse,
	GetMessagesQuery,
	GetMessagesResponse,
	GetPeersResponse,
	GetProposalQuery,
	GetProposalResponse,
	GetStatusResponse,
} from "./endpoints.js";
import type { Peer } from "./peer.js";

export type EmitOptions = {
	timeout: number;
};

export interface PeerCommunicator {
	postProposal(peer: Peer, proposal: Buffer): Promise<void>;
	postMessage(peer: Peer, message: Buffer): Promise<void>;

	pingPorts(peer: Peer): Promise<void>;

	getPeers(peer: Peer): Promise<GetPeersResponse>;
	getApiNodes(peer: Peer): Promise<GetApiNodesResponse>;
	getMessages(peer: Peer, query: GetMessagesQuery): Promise<GetMessagesResponse>;
	getProposal(peer: Peer, query: GetProposalQuery): Promise<GetProposalResponse>;
	getBlocks(
		peer: Peer,
		{ fromBlockNumber, limit }: { fromBlockNumber: number; limit?: number },
		options?: Partial<EmitOptions>,
	): Promise<GetBlocksResponse>;
	getStatus(peer: Peer, options?: Partial<EmitOptions>): Promise<GetStatusResponse>;
}
