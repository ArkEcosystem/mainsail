import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { transactionCriteriaSchemas } from "./schemas.js";
import { walletAddressSchema, walletPublicKeySchema } from "./wallets.js";

const { address, ...transactionSortingSchemaObject } = transactionCriteriaSchemas;

export const transactionHashSchema = Joi.string().hex().max(96);

export const transactionCriteriaSchemaObject = {
	hash: Joi.alternatives(
		transactionHashSchema,
		Joi.string()
			.regex(/^[\d%a-z]{1,64}$/)
			.regex(/%/),
	),
	senderPublicKey: walletPublicKeySchema,
	to: walletAddressSchema,
};

export const transactionParamSchema = transactionHashSchema;
export const blockTransactionSortingSchema = Schemas.createSortingSchema(transactionSortingSchemaObject, []);
export const transactionSortingSchema = blockTransactionSortingSchema.concat(
	Joi.object({
		orderBy: Joi.custom((value, helpers) => {
			const [property, direction = "asc"] = String([value].flat()[0] ?? "")
				.split(",")[0]
				.split(":");

			if (property === "data" || property === "transactionIndex" || (property === "to" && direction === "desc")) {
				return helpers.message({ custom: `orderBy cannot start with '${property}:${direction}'` });
			}

			return value;
		}),
	}),
);
