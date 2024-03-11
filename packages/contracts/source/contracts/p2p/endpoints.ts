import Hapi from "@hapi/hapi";

import { HeaderData } from "./header.js";
import { Socket } from "./nes.js";
import { PeerBroadcast, PeerConfig, PeerState } from "./peer.js";

export interface Request extends Hapi.Request {
	socket?: Socket;
	payload: {
		headers: HeaderData;
	};
}

export interface Response {
	headers?: HeaderData;
}

export interface GetBlocksRequest extends Request {
	payload: {
		headers: HeaderData;
		fromHeight: number;
		limit: number;
	};
}

export interface GetBlocksResponse extends Response {
	blocks: Buffer[];
}

export interface GetMessagesRequest extends Request {
	payload: {
		headers: HeaderData;
	};
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

export interface GetProposalRequest extends Request {
	payload: {
		headers: HeaderData;
	};
}

export interface GetApiNodesRequest extends Request {
	payload: {
		headers: HeaderData;
		fromHeight: number;
		limit: number;
	};
}

export interface GetApiNodesResponse extends Response {
	apiNodes: PeerBroadcast[];
}

export interface GetProposalResponse extends Response {
	proposal: Buffer;
}

export interface PostPrecommitRequest extends Request {
	payload: {
		headers: HeaderData;
		precommit: Buffer;
	};
}

export interface PostPrecommitResponse extends Response {}

export interface PostPrevoteRequest extends Request {
	payload: {
		headers: HeaderData;
		prevote: Buffer;
	};
}

export interface PostPrevoteResponse extends Response {}

export interface PostProposalRequest extends Request {
	payload: {
		headers: HeaderData;
		proposal: Buffer;
	};
}

export interface PostProposalResponse extends Response {}

export interface PostTransactionsRequest extends Request {
	payload: {
		headers: HeaderData;
		transactions: Buffer[];
	};
}

export interface PostTransactionsResponse extends Response {
	accept: string[];
}
