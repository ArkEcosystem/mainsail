import Joi from "joi";

import { headers } from "./shared";

export const getStatus = Joi.object({
	headers,
});
