import { getBlocks } from "./get-blocks";
import { getCommonBlocks } from "./get-common-blocks";
import { getMessages } from "./get-messages";
import { getPeers } from "./get-peers";
import { getProposal } from "./get-proposal";
import { getStatus } from "./get-status";
import { postBlock } from "./post-block";
import { postPrecommit } from "./post-precommit";
import { postPrevote } from "./post-prevote";
import { postProposal } from "./post-proposal";

export const Schemas = {
	getBlocks,
	getCommonBlocks,
	getMessages,
	getPeers,
	getProposal,
	getStatus,
	postBlock,
	postPrecommit,
	postPrevote,
	postProposal,
};
