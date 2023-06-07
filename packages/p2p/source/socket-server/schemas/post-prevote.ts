import Joi from "joi";

import { headers } from "./shared";

export const postPrevote = Joi.object({
	headers,
	prevote: Joi.binary(),
});
