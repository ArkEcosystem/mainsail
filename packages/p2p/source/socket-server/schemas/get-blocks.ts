import Joi from "joi";

import { headers } from "./shared";

export const getBlocks = Joi.object({
	fromHeight: Joi.number().integer().min(1).required(),
	headers,
	limit: Joi.number().integer().min(1).max(400).required(),
}).required();
