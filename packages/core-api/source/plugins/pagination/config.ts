// Based on https://github.com/fknop/hapi-pagination

import Joi from "joi";

export const getConfig = (options) => {
	const { error, value } = Joi.object({
		query: Joi.object({
			limit: Joi.object({
				default: Joi.number().integer().positive().default(100),
			}),
		}),
	}).validate(options);

	/* istanbul ignore next */
	return { config: error ? undefined : value, error: error || undefined };
};
