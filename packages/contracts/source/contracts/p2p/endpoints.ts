import Hapi from "@hapi/hapi";

import { IBlockData } from "../crypto";
import { DownloadBlock } from "../shared";

export interface IGetBlocksRequest extends Hapi.Request {
	payload: {
		lastBlockHeight: number;
		blockLimit: number;
	};
}

export type IGetBlocksResponse = DownloadBlock[];

export interface IGetCommonBlocksRequest extends Hapi.Request {
	payload: {
		ids: string[];
	};
}

export interface IGetCommonBlocksResponse {
	common: IBlockData;
	lastBlockHeight: number;
}
