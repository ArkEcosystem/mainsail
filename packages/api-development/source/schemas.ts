import Joi from "joi";

export type SchemaObject = {
	[x: string]: Joi.Schema | SchemaObject;
};

export const pagination = Joi.object({
	limit: Joi.number().integer().min(1).default(100).max(Joi.ref("$configuration.plugins.pagination.limit")),
	page: Joi.number().integer().positive().default(1),
});

export const blockId = Joi.number().integer().min(0);

export const orderBy = Joi.alternatives().try(
	Joi.string().regex(/^[._a-z]{1,40}:(asc|desc)$/i),
	Joi.array().items(Joi.string().regex(/^[._a-z]{1,40}:(asc|desc)$/i)),
);
