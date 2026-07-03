import Joi from "joi";

export const pagination = Joi.object({
	limit: Joi.number().integer().min(1).default(100).max(Joi.ref("$configuration.plugins.pagination.limit")),
	page: Joi.number().integer().positive().default(1),
});
