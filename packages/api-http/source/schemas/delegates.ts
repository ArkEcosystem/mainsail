import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { walletCriteriaSchemaObject } from "./wallets";

export const delegateCriteriaSchemaObject = {
	address: walletCriteriaSchemaObject.address,
	isResigned: Joi.boolean(),
	publicKey: walletCriteriaSchemaObject.publicKey,
	rank: Schemas.createRangeCriteriaSchema(Joi.number().integer().min(1)),
	username: Joi.string().max(256),
	votes: Schemas.createRangeCriteriaSchema(Joi.number().integer().positive()),

	// TODO: waiting for equivalent wallet attributes
	// blocks: {
	//     produced: Schemas.createRangeCriteriaSchema(Joi.number().integer().min(0)),
	//     last: {
	//         id: blockCriteriaSchemaObject.id,
	//         height: blockCriteriaSchemaObject.height,
	//         timestamp: {
	//             epoch: Schemas.createRangeCriteriaSchema(Joi.number().integer().min(0)),
	//             unix: Schemas.createRangeCriteriaSchema(Joi.number().integer().min(0)),
	//             human: Joi.string(),
	//         },
	//     },
	// },
	// production: {
	//     approval: Schemas.createRangeCriteriaSchema(Joi.number().min(0)),
	// },
	// forged: {
	//     fees: Schemas.createRangeCriteriaSchema(Joi.number().integer().positive()),
	//     rewards: Schemas.createRangeCriteriaSchema(Joi.number().integer().positive()),
	//     total: Schemas.createRangeCriteriaSchema(Joi.number().integer().positive()),
	// },
};

export const delegateCriteriaSchema = Schemas.createCriteriaSchema(delegateCriteriaSchemaObject);
export const delegateSortingSchema = Schemas.createSortingSchema(delegateCriteriaSchemaObject);
