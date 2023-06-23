import Joi from "joi";

export const headers = Joi.object({
	height: Joi.number().integer().min(1).required(),
	// eslint-disable-next-line unicorn/no-null
	proposedBlockId: Joi.string().allow(null).required(),
	round: Joi.number().integer().min(0).required(),
	step: Joi.number().integer().min(0).max(2).required(),
	validatorsSignedPrecommit: Joi.array().items(Joi.boolean()).required(), // TODO: Limit size
	validatorsSignedPrevote: Joi.array().items(Joi.boolean()).required(), // TODO: Limit size
	version: Joi.string().required(),
}).required();
