import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { transactionCriteriaSchemas } from "./schemas.js";
import { walletAddressSchema, walletPublicKeySchema } from "./wallets.js";

export const transactionIdSchema = Joi.string().hex().max(96);

export const transactionCriteriaSchemaObject = {
	id: Joi.alternatives(
		transactionIdSchema,
		Joi.string()
			.regex(/^[\d%a-z]{1,64}$/)
			.regex(/%/),
	),
	recipientId: walletAddressSchema,
	senderPublicKey: walletPublicKeySchema,
	vendorField: Joi.string().max(256),
};

export const transactionParamSchema = transactionIdSchema;
export const transactionSortingSchema = Schemas.createSortingSchema(transactionCriteriaSchemas, [], false);

export const transactionQueryLevelOptions = [
	{ allowSecondOrderBy: false, asc: true, desc: true, diverse: false, field: "version" },
	{ allowSecondOrderBy: true, asc: true, desc: true, diverse: true, field: "timestamp" },
	{ allowSecondOrderBy: false, asc: true, desc: false, diverse: false, field: "type" },
	{ allowSecondOrderBy: false, asc: true, desc: false, diverse: false, field: "amount" },
	{ allowSecondOrderBy: false, asc: true, desc: false, diverse: false, field: "fee" },
	{ allowSecondOrderBy: false, asc: true, desc: true, diverse: false, field: "typeGroup" },
	{ allowSecondOrderBy: false, asc: true, desc: true, diverse: false, field: "nonce" },
	{ allowSecondOrderBy: false, asc: false, desc: false, diverse: true, field: "id" },
	{ allowSecondOrderBy: false, asc: false, desc: false, diverse: true, field: "blockId" },
	{ allowSecondOrderBy: false, asc: false, desc: false, diverse: true, field: "senderPublicKey" },
	{ allowSecondOrderBy: false, asc: false, desc: false, diverse: true, field: "recipientId" },
];
