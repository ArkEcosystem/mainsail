import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

export const walletAddressSchema = Joi.string().hex({ prefix: true }).length(42);
export const walletPublicKeySchema = Joi.string().hex({ prefix: false }).length(66);
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
	address: Schemas.orEqualCriteria(walletAddressSchema),
	attributes: Joi.object(),
	balance: Schemas.createRangeCriteriaSchema(Joi.number().integer().positive()),
	nonce: Schemas.createRangeCriteriaSchema(Joi.number().integer().min(0)),
	publicKey: Joi.alternatives(
		walletPublicKeySchema,
		Joi.string()
			.regex(/^[\d%a-z]{1,66}$/)
			.regex(/%/),
	),
};

export const walletParamSchema = Joi.alternatives(walletAddressSchema, walletPublicKeySchema, walletUsernameSchema);
export const walletCriteriaSchema = Schemas.createCriteriaSchema({
	...walletCriteriaSchemaObject,
	address: walletAddressSchema,
});
export const walletSortingSchema = Schemas.createSortingSchema(
	{ ...walletCriteriaSchemaObject, address: walletAddressSchema },
	["attributes"],
);
