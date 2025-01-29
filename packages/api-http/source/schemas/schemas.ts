import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { walletAddressSchema } from "./wallets.js";

// Old

export const blockId = Joi.alternatives().try(
	Joi.string().min(1).max(20).regex(/^\d+$/, "decimal non-negative integer"),
	Joi.string().length(64).hex(),
);

export const orderBy = Joi.alternatives().try(
	Joi.string().regex(/^[._a-z]{1,40}:(asc|desc)$/i),
	Joi.array().items(Joi.string().regex(/^[._a-z]{1,40}:(asc|desc)$/i)),
);

export const address = walletAddressSchema;

export const delegateIdentifier = Joi.string()
	.regex(/^[\w!$&.@]+$/)
	.min(1)
	.max(66);

export const username = Joi.string()
	.regex(/^[\d!$&.@_a-z]+$/)
	.min(1)
	.max(20);

export const integerBetween = Joi.object().keys({
	from: Joi.number().integer().min(0),
	to: Joi.number().integer().min(0),
});

export const percentage = Joi.object().keys({
	from: Joi.number().precision(2).min(0).max(100),
	to: Joi.number().precision(2).min(0).max(100),
});

export const numberFixedOrBetween = Joi.alternatives().try(
	Joi.number().integer().min(0),
	Joi.object().keys({
		from: Joi.number().integer().min(0),
		to: Joi.number().integer().min(0),
	}),
);

export const blocksOrderBy = orderBy.default("height:desc");
export const transactionsOrderBy = orderBy.default(["timestamp:desc", "sequence:desc"]);

export const blockCriteriaSchemas = {
	blockSignature: Schemas.orEqualCriteria(Joi.string().hex()),
	generatorAddress: Schemas.orEqualCriteria(Joi.string().hex().length(66)),
	height: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	id: Schemas.orEqualCriteria(blockId),
	numberOfTransactions: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	payloadHash: Schemas.orEqualCriteria(Joi.string().hex()),
	payloadLength: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	previousBlock: Schemas.orEqualCriteria(blockId),
	reward: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	round: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	timestamp: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	totalAmount: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	totalFee: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	version: Schemas.orEqualCriteria(Joi.number().integer().min(0)),
};

export const transactionCriteriaSchemas = {
	address: Schemas.orEqualCriteria(address),
	amount: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	asset: Schemas.orContainsCriteria(Joi.object()),
	blockId: Schemas.orEqualCriteria(blockId),
	data: Schemas.orEqualCriteria(
		Joi.alternatives().try(Joi.string().valid("", "0x"), Joi.string().hex({ prefix: "optional" }).max(10)),
	),
	gasPrice: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	id: Schemas.orEqualCriteria(Joi.string().hex().length(64)),
	nonce: Schemas.orNumericCriteria(Joi.number().integer().positive()),
	recipientId: Schemas.orEqualCriteria(address),
	senderAddress: Schemas.orEqualCriteria(address),
	senderId: Schemas.orEqualCriteria(address),
	senderPublicKey: Schemas.orEqualCriteria(Joi.string().hex().length(66)),
	sequence: Schemas.orNumericCriteria(Joi.number().integer().positive()),
	timestamp: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
};
