import Joi from "joi";

import { headers } from "./shared";

export const getProposal = Joi.object({
	headers,
});
