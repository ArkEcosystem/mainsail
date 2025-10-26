import { getApiNodes } from "./get-api-nodes.js";
import { getBlocks } from "./get-blocks.js";
import { getMessages } from "./get-messages.js";
import { getPeers } from "./get-peers.js";
import { getProposal } from "./get-proposal.js";
import { getStatus } from "./get-status.js";
import { headers } from "./headers.js";
import { postPrecommit } from "./post-precommit.js";
import { postPrevote } from "./post-prevote.js";
import { postProposal } from "./post-proposal.js";

export const replySchemas = {
	getApiNodes,
	getBlocks,
	getMessages,
	getPeers,
	getProposal,
	getStatus,
	headers,
	postPrecommit,
	postPrevote,
	postProposal,
};
