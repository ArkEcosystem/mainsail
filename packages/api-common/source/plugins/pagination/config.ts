// Based on https://github.com/fknop/hapi-pagination

import Joi from "joi";

export const getConfig = (options: Joi.ValidationOptions): { config?: object; error?: Joi.ValidationError } => {
	const { error, value } = Joi.object({
		maxDepth: Joi.number().integer().positive(),
		query: Joi.object({
			limit: Joi.object({
				default: Joi.number().integer().positive().default(100),
			}),
		}),
	}).validate(options);

	return { config: error ? undefined : value, error: error || undefined };
};
