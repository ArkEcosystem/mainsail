import Joi from "joi";

import { headers } from "./shared";

export const getMessages = Joi.object({
	headers,
});
