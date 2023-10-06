import Joi from "joi";

import { Schemas } from "@mainsail/api-common";

export const walletAddressSchema = Joi.string().alphanum(); /* TODO: .length(34); */
export const walletPublicKeySchema = Joi.string().hex(); /* TODO: .length(66); */
export const walletUsernameSchema = Joi.string().max(256);

export const walletId = Joi.alternatives().try(
	Joi.string()
		.regex(/^[\d!$&.@_a-z]+$/)
		.min(1)
		.max(20),
	walletAddressSchema,
	walletPublicKeySchema,
);

export const walletCriteriaSchemaObject = {
	address: Joi.alternatives(
		walletAddressSchema,
		Joi.string()
			.regex(/^[\d%A-Za-z]{1,34}$/)
			.regex(/%/),
	),
	attributes: Joi.object(),
	balance: Schemas.createRangeCriteriaSchema(Joi.number().integer().positive()),
	nonce: Schemas.createRangeCriteriaSchema(Joi.number().integer().positive()),
	publicKey: Joi.alternatives(
		walletPublicKeySchema,
		Joi.string()
			.regex(/^[\d%a-z]{1,66}$/)
			.regex(/%/),
	),
};

export const walletParamSchema = Joi.alternatives(walletAddressSchema, walletPublicKeySchema, walletUsernameSchema);
export const walletCriteriaSchema = Schemas.createCriteriaSchema(walletCriteriaSchemaObject);
export const walletSortingSchema = Schemas.createSortingSchema(walletCriteriaSchemaObject, ["attributes"]);
