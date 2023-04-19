import Joi from "joi";

import { headers } from "./shared";

export const getBlocks = Joi.object({
	blockLimit: Joi.number().integer().min(1).max(400),
	headers,
	headersOnly: Joi.boolean(),
	lastBlockHeight: Joi.number().integer().min(1),
	serialized: Joi.boolean(),
});
