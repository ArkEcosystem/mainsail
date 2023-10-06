import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { blockCriteriaSchemas } from "./schemas";

const blockHeightSchema = Joi.number().integer().min(1);
const blockIdSchema = Joi.alternatives(Joi.string().min(13).max(20).regex(/^\d+$/), Joi.string().hex().length(64));

export const blockCriteriaSchemaObject = {
	height: Joi.alternatives(
		blockHeightSchema,
		Joi.object({ from: blockHeightSchema, to: blockHeightSchema }).or("from", "to"),
	),
	id: Joi.alternatives(
		blockIdSchema,
		Joi.string()
			.regex(/^[\d%a-z]{1,64}$/)
			.regex(/%/),
		Joi.string()
			.regex(/^[\d%]{1,20}$/)
			.regex(/%/),
	),
	timestamp: Joi.alternatives(
		Joi.number().integer().min(0),
		Joi.object({ from: Joi.number().integer().min(0), to: Joi.number().integer().min(0) }).or("from", "to"),
	),
};

export const blockParamSchema = Joi.alternatives(blockIdSchema, blockHeightSchema);
export const blockSortingSchema = Schemas.createSortingSchema(blockCriteriaSchemas, [], false);

export const blockQueryLevelOptions = [
	{ allowSecondOrderBy: false, asc: true, desc: true, diverse: false, field: "version" },
	{ allowSecondOrderBy: true, asc: true, desc: true, diverse: true, field: "timestamp" },
	{ allowSecondOrderBy: true, asc: true, desc: true, diverse: true, field: "height" },
	{ allowSecondOrderBy: false, asc: true, desc: false, diverse: false, field: "numberOfTransactions" },
	{ allowSecondOrderBy: false, asc: true, desc: false, diverse: false, field: "totalAmount" },
	{ allowSecondOrderBy: false, asc: true, desc: false, diverse: false, field: "totalFee" },
	{ allowSecondOrderBy: false, asc: true, desc: true, diverse: false, field: "reward" },
	{ allowSecondOrderBy: false, asc: false, desc: false, diverse: true, field: "id" },
	{ allowSecondOrderBy: false, asc: false, desc: false, diverse: true, field: "previousBlock" },
];
