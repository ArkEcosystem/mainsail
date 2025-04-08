import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { blockCriteriaSchemaObject } from "./blocks.js";
import { walletAddressSchema, walletCriteriaSchemaObject } from "./wallets.js";

export const validatorCriteriaSchemaObject = {
	address: Schemas.orEqualCriteria(walletAddressSchema),
	attributes: Joi.object(),
	blocks: {
		last: {
			hash: blockCriteriaSchemaObject.hash,
			number: blockCriteriaSchemaObject.number,
		},
		produced: Schemas.createRangeCriteriaSchema(Joi.number().integer().min(0)),
	},
	forged: {
		fees: Schemas.createRangeCriteriaSchema(Joi.number().integer().positive()),
		rewards: Schemas.createRangeCriteriaSchema(Joi.number().integer().positive()),
		total: Schemas.createRangeCriteriaSchema(Joi.number().integer().positive()),
	},
	isResigned: Joi.boolean(),
	production: {
		approval: Schemas.createRangeCriteriaSchema(Joi.number().min(0)),
	},
	publicKey: walletCriteriaSchemaObject.publicKey,
	rank: Schemas.createRangeCriteriaSchema(Joi.number().integer().min(1)),
	username: Joi.string().max(256),
	votes: Schemas.createRangeCriteriaSchema(Joi.number().integer().positive()),
};

export const validatorCriteriaSchema = Schemas.createCriteriaSchema({
	...validatorCriteriaSchemaObject,
	address: walletAddressSchema,
});
export const validatorSortingSchema = Schemas.createSortingSchema(
	{
		...validatorCriteriaSchemaObject,
		address: walletAddressSchema,
	},
	["attributes"],
	false,
);
