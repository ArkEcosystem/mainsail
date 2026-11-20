import type { Interfaces } from "@mainsail/p2p-websocket";

import { getApiNodes } from "./get-api-nodes.js";
import { getBlocks } from "./get-blocks.js";
import { getMessages } from "./get-messages.js";
import { getPeers } from "./get-peers.js";
import { getProposal } from "./get-proposal.js";
import { getStatus } from "./get-status.js";
import { postMessage } from "./post-message.js";
import { postProposal } from "./post-proposal.js";

// One entry per route, named like its codec. The schemas describe the data as the codec hands it over.
export const Schemas: Record<
	| "getApiNodes"
	| "getBlocks"
	| "getMessages"
	| "getPeers"
	| "getProposal"
	| "getStatus"
	| "postMessage"
	| "postProposal",
	Interfaces.RouteSchema
> = {
	getApiNodes,
	getBlocks,
	getMessages,
	getPeers,
	getProposal,
	getStatus,
	postMessage,
	postProposal,
};
