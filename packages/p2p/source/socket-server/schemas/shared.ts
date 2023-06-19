import Joi from "joi";

export const headers = Joi.object({
	height: Joi.number().integer().min(1).required(),
	round: Joi.number().integer().min(0).required(),
	step: Joi.number().integer().min(0).max(2).required(),
	version: Joi.string().required(),
}).required();
