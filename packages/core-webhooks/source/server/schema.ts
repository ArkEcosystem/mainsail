import Joi from "joi";

export const conditions: string[] = [
	"between",
	"contains",
	"eq",
	"falsy",
	"gt",
	"gte",
	"lt",
	"lte",
	"ne",
	"not-between",
	"regexp",
	"truthy",
];

export const show: object = {
	params: Joi.object({
		id: Joi.string().required(),
	}),
};

export const store: object = {
	payload: Joi.object({
		conditions: Joi.array()
			.items(
				Joi.object({
					condition: Joi.string()
						.allow(...conditions)
						.required(),
					key: Joi.string().required(),
					value: Joi.any(),
				}),
			)
			.required(),
		enabled: Joi.boolean().default(true),
		event: Joi.string().required(),
		target: Joi.string().uri().required(),
	}),
};

export const update: object = {
	params: Joi.object({
		id: Joi.string().required(),
	}),
	payload: Joi.object({
		conditions: Joi.array()
			.items(
				Joi.object({
					condition: Joi.string()
						.allow(...conditions)
						.required(),
					key: Joi.string().required(),
					value: Joi.any(),
				}),
			)
			.required(),
		enabled: Joi.boolean().required(),
		event: Joi.string().required(),
		target: Joi.string().uri().required(),
	}),
};

export const destroy: object = {
	params: Joi.object({
		id: Joi.string().required(),
	}),
};
