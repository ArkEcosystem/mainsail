import type { Contracts } from "@mainsail/contracts";
import type Joi from "joi";

import { getApiNodes } from "./get-api-nodes.js";
import { getBlocks } from "./get-blocks.js";
import { getMessages } from "./get-messages.js";
import { getPeers } from "./get-peers.js";
import { getProposal } from "./get-proposal.js";
import { getStatus } from "./get-status.js";
import { postMessage } from "./post-message.js";
import { postProposal } from "./post-proposal.js";

export const Schemas: Record<
	| "getApiNodes"
	| "getBlocks"
	| "getMessages"
	| "getPeers"
	| "getProposal"
	| "getStatus"
	| "postMessage"
	| "postProposal",
	(configuration: Contracts.Crypto.Configuration) => Joi.Schema
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
