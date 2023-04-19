import Joi from "joi";

import { headers } from "./shared";

export const getPeers = Joi.object({
	headers,
});
