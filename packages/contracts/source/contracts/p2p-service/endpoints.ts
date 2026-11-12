import type { HeaderData } from "./header.js";
import type { PeerBroadcast, PeerConfig, PeerState } from "./peer.js";

export interface Response {
	headers?: HeaderData;
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

export type PostMessageResponse = Response;

export type PostProposalResponse = Response;
