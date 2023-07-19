import Hapi from "@hapi/hapi";

import { IBlockData } from "../crypto";
import { IHeaderData } from "./header";
import { Socket } from "./nes";
import { PeerBroadcast, PeerPingResponse } from "./peer";

export interface Request extends Hapi.Request {
	socket?: Socket;
	payload: {
		headers: IHeaderData;
	};
}

export interface IGetBlocksRequest extends Request {
	payload: {
		headers: IHeaderData;
		fromHeight: number;
		limit: number;
	};
}

export type IGetBlocksResponse = { blocks: Buffer[] };

export interface IGetCommonBlocksRequest extends Request {
	payload: {
		headers: IHeaderData;
		ids: string[];
	};
}

export interface IGetCommonBlocksResponse {
	common: IBlockData;
	lastBlockHeight: number;
}

export interface IGetMessagesRequest extends Request {
	payload: {
		headers: IHeaderData;
	};
}

export interface IGetMessagesResponse {
	precommits: Buffer[];
	prevotes: Buffer[];
}

export type IGetPeersResponse = {
	peers: PeerBroadcast[];
};

export type IGetStatusResponse = PeerPingResponse;

export interface IGetProposalRequest extends Request {
	payload: {
		headers: IHeaderData;
	};
}

export interface IGetProposalResponse {
	proposal: Buffer;
}

export interface IPostPrecommitRequest extends Request {
	payload: {
		headers: IHeaderData;
		precommit: Buffer;
	};
}

export interface IPostPrecommitResponse {}

export interface IPostPrevoteRequest extends Request {
	payload: {
		headers: IHeaderData;
		prevote: Buffer;
	};
}

export interface IPostPrevoteResponse {}

export interface IPostProposalRequest extends Request {
	payload: {
		headers: IHeaderData;
		proposal: Buffer;
	};
}

export interface IPostProposalResponse {}

export interface IPostTransactionsRequest extends Request {
	payload: {
		headers: IHeaderData;
		transactions: Buffer[];
	};
}

export type IPostTransactionsResponse = {
	accept: string[];
};
