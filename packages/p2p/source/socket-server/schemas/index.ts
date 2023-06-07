import { getBlocks } from "./get-blocks";
import { getCommonBlocks } from "./get-common-blocks";
import { getPeers } from "./get-peers";
import { getStatus } from "./get-status";
import { postBlock } from "./post-block";
import { postPrecommit } from "./post-precommit";
import { postPrevote } from "./post-prevote";

export const Schemas = {
	getBlocks,
	getCommonBlocks,
	getPeers,
	getStatus,
	postBlock,
	postPrecommit,
	postPrevote,
};
