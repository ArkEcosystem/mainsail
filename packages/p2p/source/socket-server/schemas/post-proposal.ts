import Joi from "joi";

import { headers } from "./shared";

export const postProposal = Joi.object({
	headers,
	proposal: Joi.binary(),
});
