import type Hapi from "@hapi/hapi";

import type { ApiNodeBroadcast } from "./api-node.js";
import type { HeaderData } from "./header.js";
import type { Socket } from "./nes.js";
import type { PeerBroadcast, PeerConfig, PeerState } from "./peer.js";
import type { EmitStatistic } from "./statistic.js";

export interface Request extends Hapi.Request {
	socket?: Socket;
	payload: {
		headers: HeaderData;
	};
}

export interface EmitResult<T extends Response> extends EmitStatistic {
	data: T;
}

export interface Response {
	headers?: HeaderData;
}

export interface GetBlocksRequest extends Request {
	payload: {
		headers: HeaderData;
		fromBlockNumber: number;
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
		fromBlockNumber: number;
		limit: number;
	};
}

export interface GetApiNodesResponse extends Response {
	apiNodes: ApiNodeBroadcast[];
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

export type PostPrecommitResponse = Response;

export interface PostPrevoteRequest extends Request {
	payload: {
		headers: HeaderData;
		prevote: Buffer;
	};
}

export type PostPrevoteResponse = Response;

export interface PostProposalRequest extends Request {
	payload: {
		headers: HeaderData;
		proposal: Buffer;
	};
}

export type PostProposalResponse = Response;
