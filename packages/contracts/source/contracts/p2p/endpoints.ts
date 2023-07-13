import Hapi from "@hapi/hapi";

import { IBlockData } from "../crypto";
import { IHeaderData } from "./header";
import { Socket } from "./nes";
import { PeerBroadcast, PeerPingResponse } from "./peer";

export interface Request extends Hapi.Request {
	socket?: Socket;
}

export interface IGetBlocksRequest extends Request {
	payload: {
		fromHeight: number;
		limit: number;
	};
}

export type IGetBlocksResponse = { blocks: String[] };

export interface IGetCommonBlocksRequest extends Request {
	payload: {
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
	precommits: string[];
	prevotes: string[];
}

export type IGetPeersResponse = PeerBroadcast[];

export type IGetStatusResponse = PeerPingResponse;

export interface IGetProposalRequest extends Request {
	payload: {
		headers: IHeaderData;
	};
}

export interface IGetProposalResponse {
	proposal: string;
}

export interface IPostPrecommitRequest extends Request {
	payload: {
		precommit: Buffer;
	};
}

export interface IPostPrecommitResponse {}

export interface IPostPrevoteRequest extends Request {
	payload: {
		prevote: Buffer;
	};
}

export interface IPostPrevoteResponse {}

export interface IPostProposalRequest extends Request {
	payload: {
		proposal: Buffer;
	};
}

export interface IPostProposalResponse {}

export interface IPostTransactionsRequest extends Request {
	payload: {
		transactions: Buffer[];
	};
}

export type IPostTransactionsResponse = string[];
