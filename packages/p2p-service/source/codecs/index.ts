import { getApiNodes } from "./get-api-nodes.js";
import { getBlocks } from "./get-blocks.js";
import { getMessages } from "./get-messages.js";
import { getPeers } from "./get-peers.js";
import { getProposal } from "./get-proposal.js";
import { getStatus } from "./get-status.js";
import { postMessage } from "./post-message.js";
import { postProposal } from "./post-proposal.js";

// The request types describe a request that fits the schema of its route. The validation step runs
// right after the codec, so the route and every later step see no other.
export const Codecs = {
	getApiNodes,
	getBlocks,
	getMessages,
	getPeers,
	getProposal,
	getStatus,
	postMessage,
	postProposal,
};
