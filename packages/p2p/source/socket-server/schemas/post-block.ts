import Joi from "joi";

import { headers } from "./shared";

export const postBlock = Joi.object({
	block: Joi.binary(),
	headers,
});
