import Hapi from "@hapi/hapi";

import { DownloadBlock } from "../shared";

export interface IGetBlocksRequest extends Hapi.Request {
	payload: {
		lastBlockHeight: number;
		blockLimit: number;
	};
}

export type IGetBlocksResponse = DownloadBlock[];
