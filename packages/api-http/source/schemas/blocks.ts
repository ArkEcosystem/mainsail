import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { blockCriteriaSchemas } from "./schemas.js";

const blockNumberSchema = Joi.number().integer().min(1);
const blockHashSchema = Joi.alternatives(Joi.string().min(13).max(20).regex(/^\d+$/), Joi.string().hex().length(64));

export const blockCriteriaSchemaObject = {
	hash: Joi.alternatives(
		blockHashSchema,
		Joi.string()
			.regex(/^[\d%a-z]{1,64}$/)
			.regex(/%/),
		Joi.string()
			.regex(/^[\d%]{1,20}$/)
			.regex(/%/),
	),
	number: Joi.alternatives(
		blockNumberSchema,
		Joi.object({ from: blockNumberSchema, to: blockNumberSchema }).or("from", "to"),
	),
	timestamp: Joi.alternatives(
		Joi.number().integer().min(0),
		Joi.object({ from: Joi.number().integer().min(0), to: Joi.number().integer().min(0) }).or("from", "to"),
	),
};

export const blockParamSchema = Joi.alternatives(blockHashSchema, blockNumberSchema);
export const blockSortingSchema = Schemas.createSortingSchema(blockCriteriaSchemas, []);
