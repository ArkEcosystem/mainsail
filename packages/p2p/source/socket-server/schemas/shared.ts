import Joi from "joi";

export const headers = Joi.object({
	height: Joi.number().integer().min(1),
	round: Joi.number().integer().min(0),
	version: Joi.string(),
});
