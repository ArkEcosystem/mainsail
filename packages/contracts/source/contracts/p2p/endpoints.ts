import Hapi from "@hapi/hapi";

import { IHeaderData } from "./header";
import { Socket } from "./nes";
import { PeerBroadcast, PeerConfig, PeerState } from "./peer";

export interface Request extends Hapi.Request {
	socket?: Socket;
	payload: {
		headers: IHeaderData;
	};
}

export interface Response {
	headers?: IHeaderData;
}

export interface IGetBlocksRequest extends Request {
	payload: {
		headers: IHeaderData;
		fromHeight: number;
		limit: number;
	};
}

export interface IGetBlocksResponse extends Response {
	blocks: Buffer[];
}

export interface IGetMessagesRequest extends Request {
	payload: {
		headers: IHeaderData;
	};
}

export interface IGetMessagesResponse extends Response {
	precommits: Buffer[];
	prevotes: Buffer[];
}

export interface IGetPeersResponse extends Response {
	peers: PeerBroadcast[];
}

export interface IGetStatusResponse extends Response {
	state: PeerState;
	config: PeerConfig;
}

export interface IGetProposalRequest extends Request {
	payload: {
		headers: IHeaderData;
	};
}

export interface IGetApiNodesRequest extends Request {
	payload: {
		headers: IHeaderData;
		fromHeight: number;
		limit: number;
	};
}

export interface IGetApiNodesResponse extends Response {
	apiNodes: PeerBroadcast[];
}

export interface IGetProposalResponse extends Response {
	proposal: Buffer;
}

export interface IPostPrecommitRequest extends Request {
	payload: {
		headers: IHeaderData;
		precommit: Buffer;
	};
}

export interface IPostPrecommitResponse extends Response {}

export interface IPostPrevoteRequest extends Request {
	payload: {
		headers: IHeaderData;
		prevote: Buffer;
	};
}

export interface IPostPrevoteResponse extends Response {}

export interface IPostProposalRequest extends Request {
	payload: {
		headers: IHeaderData;
		proposal: Buffer;
	};
}

export interface IPostProposalResponse extends Response {}

export interface IPostTransactionsRequest extends Request {
	payload: {
		headers: IHeaderData;
		transactions: Buffer[];
	};
}

export interface IPostTransactionsResponse extends Response {
	accept: string[];
}
