import Joi from "joi";

export const legacyAddressSchema = Joi.string()
	.min(33)
	.max(34)
	.pattern(/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/);
