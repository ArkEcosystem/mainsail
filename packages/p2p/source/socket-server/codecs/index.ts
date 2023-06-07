import { getBlocks } from "./get-blocks";
import { getCommonBlocks } from "./get-common-blocks";
import { getPeers } from "./get-peers";
import { getStatus } from "./get-status";
import { postBlock } from "./post-block";
import { postPrevote } from "./post-prevote";
import { postTransactions } from "./post-transactions";

export const Codecs = {
	getBlocks,
	getCommonBlocks,
	getPeers,
	getStatus,
	postBlock,
	postPrevote,
	postTransactions,
};
