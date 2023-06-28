import Joi from "joi";

import { headers } from "./shared";

export const getBlocks = Joi.object({
	fromHeight: Joi.number().integer().min(1),
	headers,
	limit: Joi.number().integer().min(1).max(400),
});
