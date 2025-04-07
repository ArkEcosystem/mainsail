import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { transactionCriteriaSchemas } from "./schemas.js";
import { walletAddressSchema, walletPublicKeySchema } from "./wallets.js";

export const transactionIdSchema = Joi.string().hex().max(96);

export const transactionCriteriaSchemaObject = {
	hash: Joi.alternatives(
		transactionIdSchema,
		Joi.string()
			.regex(/^[\d%a-z]{1,64}$/)
			.regex(/%/),
	),
	to: walletAddressSchema,
	senderPublicKey: walletPublicKeySchema,
};

export const transactionParamSchema = transactionIdSchema;
export const transactionSortingSchema = Schemas.createSortingSchema(transactionCriteriaSchemas, [], false);
