import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import { getBlocks } from "./get-blocks";
import { getCommonBlocks } from "./get-common-blocks";
import { getMessages } from "./get-messages";
import { getPeers } from "./get-peers";
import { getProposal } from "./get-proposal";
import { getStatus } from "./get-status";
import { postPrecommit } from "./post-precommit";
import { postPrevote } from "./post-prevote";
import { postProposal } from "./post-proposal";

export const Schemas: Record<string, (configuration: Contracts.Crypto.IConfiguration) => Joi.ObjectSchema<any>> = {
	getBlocks,
	getCommonBlocks,
	getMessages,
	getPeers,
	getProposal,
	getStatus,
	postPrecommit,
	postPrevote,
	postProposal,
};
