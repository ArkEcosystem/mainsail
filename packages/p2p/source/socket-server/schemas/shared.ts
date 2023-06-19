import Joi from "joi";

export const headers = Joi.object({
	height: Joi.number().integer().min(1),
	round: Joi.number().integer().min(0),
	step: Joi.number().integer().min(0).max(2),
	version: Joi.string(),
});
