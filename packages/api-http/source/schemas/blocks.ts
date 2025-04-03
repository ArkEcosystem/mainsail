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
export const blockSortingSchema = Schemas.createSortingSchema(blockCriteriaSchemas, [], false);

export const blockQueryLevelOptions = [
	{ allowSecondOrderBy: false, asc: true, desc: true, diverse: false, field: "version" },
	{ allowSecondOrderBy: true, asc: true, desc: true, diverse: true, field: "timestamp" },
	{ allowSecondOrderBy: true, asc: true, desc: true, diverse: true, field: "number" },
	{ allowSecondOrderBy: false, asc: true, desc: false, diverse: false, field: "transactionsCount" },
	{ allowSecondOrderBy: false, asc: true, desc: false, diverse: false, field: "amount" },
	{ allowSecondOrderBy: false, asc: true, desc: false, diverse: false, field: "fee" },
	{ allowSecondOrderBy: false, asc: true, desc: true, diverse: false, field: "reward" },
	{ allowSecondOrderBy: false, asc: false, desc: false, diverse: true, field: "hash" },
	{ allowSecondOrderBy: false, asc: false, desc: false, diverse: true, field: "parentHash" },
];
