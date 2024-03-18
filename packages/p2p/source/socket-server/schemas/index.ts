import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { getApiNodes } from "./get-api-nodes.js";
import { getBlocks } from "./get-blocks.js";
import { getMessages } from "./get-messages.js";
import { getPeers } from "./get-peers.js";
import { getProposal } from "./get-proposal.js";
import { getStatus } from "./get-status.js";
import { postPrecommit } from "./post-precommit.js";
import { postPrevote } from "./post-prevote.js";
import { postProposal } from "./post-proposal.js";

export const Schemas: Record<string, (configuration: Contracts.Crypto.Configuration) => Joi.ObjectSchema<any>> = {
	getApiNodes,
	getBlocks,
	getMessages,
	getPeers,
	getProposal,
	getStatus,
	postPrecommit,
	postPrevote,
	postProposal,
};
