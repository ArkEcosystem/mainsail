import Joi from "joi";

export const pagination = Joi.object({
	limit: Joi.number()
		.integer()
		.min(1)
		// Cap the default at the configured maximum so a limit below 100 doesn't reject bare requests.
		.default((_, helpers) => Math.min(100, helpers.prefs.context?.configuration?.plugins?.pagination?.limit ?? 100))
		.max(Joi.ref("$configuration.plugins.pagination.limit")),
	page: Joi.number().integer().positive().default(1),
});
