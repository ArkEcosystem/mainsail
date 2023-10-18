import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { blockCriteriaSchemaObject } from "./blocks";
import { walletCriteriaSchemaObject } from "./wallets";

export const delegateCriteriaSchemaObject = {
	address: walletCriteriaSchemaObject.address,
	blocks: {
		last: {
			height: blockCriteriaSchemaObject.height,
			id: blockCriteriaSchemaObject.id,
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

export const delegateCriteriaSchema = Schemas.createCriteriaSchema(delegateCriteriaSchemaObject);
export const delegateSortingSchema = Schemas.createSortingSchema(delegateCriteriaSchemaObject);
