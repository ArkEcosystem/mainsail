import Joi from "joi";

export const headers = Joi.object({
	height: Joi.number().min(1),
	version: Joi.string(),
});
