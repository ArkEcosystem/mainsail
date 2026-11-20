import type { ApiNodeBroadcast } from "../p2p-api-nodes/api-node.js";
import type { HeaderData } from "./header.js";
import type { PeerBroadcast, PeerConfig, PeerState } from "./peer.js";

export interface Response {
	headers?: HeaderData;
}

export interface GetApiNodesResponse extends Response {
	apiNodes: ApiNodeBroadcast[];
}

export interface GetBlocksResponse extends Response {
	blocks: Buffer[];
}

export interface GetMessagesQuery {
	blockNumber: number;
	round: number;
	validatorsSignedPrevote: readonly boolean[];
	validatorsSignedPrecommit: readonly boolean[];
}

export interface GetMessagesResponse extends Response {
	precommits: Buffer[];
	prevotes: Buffer[];
}

export interface GetPeersResponse extends Response {
	peers: PeerBroadcast[];
}

export interface GetStatusResponse extends Response {
	state: PeerState;
	config: PeerConfig;
}

export interface GetProposalQuery {
	blockNumber: number;
	round: number;
}

export interface GetProposalResponse extends Response {
	proposal: Buffer;
}
