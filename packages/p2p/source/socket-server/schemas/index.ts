import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { getApiNodes } from "./get-api-nodes";
import { getBlocks } from "./get-blocks";
import { getMessages } from "./get-messages";
import { getPeers } from "./get-peers";
import { getProposal } from "./get-proposal";
import { getStatus } from "./get-status";
import { postPrecommit } from "./post-precommit";
import { postPrevote } from "./post-prevote";
import { postProposal } from "./post-proposal";

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
