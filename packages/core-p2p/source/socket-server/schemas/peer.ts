import Joi from "joi";

import { headers } from "./shared";

export const peerSchemas = {
	getCommonBlocks: Joi.object({
		// TODO strings are block ids
headers, 
		ids: Joi.array().min(1).max(10).items(Joi.string()),
	}),

	getPeers: Joi.object({
		headers,
	}),

	getStatus: Joi.object({
		headers,
	}),
};
