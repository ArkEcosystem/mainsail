import { Schemas } from "@mainsail/api-common";
import Joi from "joi";

import { walletAddressSchema } from "./wallets.js";

export const blockHash = Joi.alternatives().try(
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

export const blocksOrderBy = orderBy.default("number:desc");
export const transactionsOrderBy = orderBy.default(["timestamp:desc", "transactionIndex:desc"]);

export const blockCriteriaSchemas = {
	amount: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	fee: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	hash: Schemas.orEqualCriteria(blockHash),
	number: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	parentHash: Schemas.orEqualCriteria(blockHash),
	payloadHash: Schemas.orEqualCriteria(Joi.string().hex()),
	payloadSize: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	proposer: Schemas.orEqualCriteria(Joi.string().hex().length(66)),
	reward: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	round: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	timestamp: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	transactionsCount: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
};

export const transactionCriteriaSchemas = {
	address: Schemas.orEqualCriteria(address),
	asset: Schemas.orContainsCriteria(Joi.object()),
	blockHash: Schemas.orEqualCriteria(blockHash),
	data: Schemas.orEqualCriteria(
		Joi.alternatives().try(Joi.string().valid("", "0x"), Joi.string().hex({ prefix: "optional" }).max(10)),
	),
	from: Schemas.orEqualCriteria(address),
	gasPrice: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	hash: Schemas.orEqualCriteria(Joi.string().hex().length(64)),
	nonce: Schemas.orNumericCriteria(Joi.number().integer().positive()),
	senderId: Schemas.orEqualCriteria(address),
	senderPublicKey: Schemas.orEqualCriteria(Joi.string().hex().length(66)),
	timestamp: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
	to: Schemas.orEqualCriteria(address),
	transactionIndex: Schemas.orNumericCriteria(Joi.number().integer().positive()),
	value: Schemas.orNumericCriteria(Joi.number().integer().min(0)),
};
