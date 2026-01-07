import { getApiNodes } from "./get-api-nodes.js";
import { getBlocks } from "./get-blocks.js";
import { getMessages } from "./get-messages.js";
import { getPeers } from "./get-peers.js";
import { getProposal } from "./get-proposal.js";
import { getStatus } from "./get-status.js";
import { postPrevote } from "./post-prevote.js";
import { postProposal } from "./post-proposal.js";

export const Codecs = {
	getApiNodes,
	getBlocks,
	getMessages,
	getPeers,
	getProposal,
	getStatus,
	postPrevote,
	postProposal,
};
