import Joi from "joi";

import { headers } from "./shared";

export const postPrecommit = Joi.object({
	headers,
	precommit: Joi.binary(),
});
