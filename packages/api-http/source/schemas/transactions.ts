import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { transactionCriteriaSchemas } from "./schemas.js";
import { walletAddressSchema, walletPublicKeySchema } from "./wallets.js";

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
export const transactionSortingSchema = Schemas.createSortingSchema(transactionCriteriaSchemas, [], false);
