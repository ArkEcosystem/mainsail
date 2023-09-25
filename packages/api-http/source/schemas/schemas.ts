import { Search } from "@mainsail/api-database";
import Joi from "joi";

const isSchema = (value: Joi.Schema | SchemaObject): value is Joi.Schema => Joi.isSchema(value);

// Criteria

export type SchemaObject = {
	[x: string]: Joi.Schema | SchemaObject;
};

export const createCriteriaSchema = (schemaObject: SchemaObject): Joi.ObjectSchema => {
	const schema = {};

	for (const [key, value] of Object.entries(schemaObject)) {
		schema[key] = Joi.array()
			.single()
			.items(isSchema(value) ? value : createCriteriaSchema(value));
	}

	return Joi.object(schema);
};

export const createRangeCriteriaSchema = (item: Joi.Schema): Joi.Schema =>
	Joi.alternatives(item, Joi.object({ from: item, to: item }).or("from", "to"));

// Sorting

export const createSortingSchema = (
	schemaObject: SchemaObject,
	wildcardPaths: string[] = [],
	transform = true,
): Joi.ObjectSchema => {
	const getObjectPaths = (object: SchemaObject): string[] =>
		Object.entries(object).flatMap(([key, value]) =>
			isSchema(value) ? key : getObjectPaths(value).map((p) => `${key}.${p}`),
		);

	const exactPaths = getObjectPaths(schemaObject);

	const orderBy = Joi.custom((value, helpers) => {
		if (value === "") {
			return [];
		}

		const sorting: Search.Sorting = [];

		const sortingCriteria: string[] = Array.isArray(value) ? value : [value];

		for (const criteria of sortingCriteria) {
			for (const item of criteria.split(",")) {
				const pair = item.split(":");
				const property = String(pair[0]);
				const direction = pair.length === 1 ? "asc" : pair[1];

				if (!exactPaths.includes(property) && !wildcardPaths.find((wp) => property.startsWith(`${wp}.`))) {
					return helpers.message({
						custom: `Unknown orderBy property '${property}'`,
					});
				}

				if (direction !== "asc" && direction !== "desc") {
					return helpers.message({
						custom: `Unexpected orderBy direction '${direction}' for property '${property}'`,
					});
				}

				if (transform) {
					sorting.push({ direction: direction, property });
				}
			}
		}

		if (!transform) {
			return value;
		}

		return sorting;
	});

	if (transform) {
		return Joi.object({ orderBy: orderBy.default([]) });
	} else {
		return Joi.object({ orderBy });
	}
};

export const pagination = Joi.object({
	limit: Joi.number().integer().min(1).default(100).max(Joi.ref("$configuration.plugins.pagination.limit")),
	offset: Joi.number().integer().min(0),
	page: Joi.number().integer().positive().default(1),
});

// Old

export const blockId = Joi.alternatives().try(
	Joi.string().min(1).max(20).regex(/^\d+$/, "decimal non-negative integer"),
	Joi.string().length(64).hex(),
);

export const orderBy = Joi.alternatives().try(
	Joi.string().regex(/^[._a-z]{1,40}:(asc|desc)$/i),
	Joi.array().items(Joi.string().regex(/^[._a-z]{1,40}:(asc|desc)$/i)),
);

export const address = Joi.string().alphanum().length(34);

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

export const walletId = Joi.alternatives().try(
	Joi.string()
		.regex(/^[\d!$&.@_a-z]+$/)
		.min(1)
		.max(20),
	Joi.string().alphanum().length(34),
	Joi.string().hex().length(66),
);

export const blocksOrderBy = orderBy.default("height:desc");
export const transactionsOrderBy = orderBy.default(["timestamp:desc", "sequence:desc"]);

const equalCriteria = (value: any) => value;
const numericCriteria = (value: any) =>
	Joi.alternatives().try(
		value,
		Joi.object().keys({ from: value }),
		Joi.object().keys({ to: value }),
		Joi.object().keys({ from: value, to: value }),
	);
const likeCriteria = (value: any) => value;
const containsCriteria = (value: any) => value;
const orCriteria = (criteria: any) => Joi.alternatives().try(criteria, Joi.array().items(criteria));
const orEqualCriteria = (value: any) => orCriteria(equalCriteria(value));
const orNumericCriteria = (value: any) => orCriteria(numericCriteria(value));
const orLikeCriteria = (value: any) => orCriteria(likeCriteria(value));
const orContainsCriteria = (value: any) => orCriteria(containsCriteria(value));

export const blockCriteriaSchemas = {
	blockSignature: orEqualCriteria(Joi.string().hex()),
	generatorPublicKey: orEqualCriteria(Joi.string().hex().length(66)),
	height: orNumericCriteria(Joi.number().integer().min(0)),
	id: orEqualCriteria(blockId),
	numberOfTransactions: orNumericCriteria(Joi.number().integer().min(0)),
	payloadHash: orEqualCriteria(Joi.string().hex()),
	payloadLength: orNumericCriteria(Joi.number().integer().min(0)),
	previousBlock: orEqualCriteria(blockId),
	reward: orNumericCriteria(Joi.number().integer().min(0)),
	timestamp: orNumericCriteria(Joi.number().integer().min(0)),
	totalAmount: orNumericCriteria(Joi.number().integer().min(0)),
	totalFee: orNumericCriteria(Joi.number().integer().min(0)),
	version: orEqualCriteria(Joi.number().integer().min(0)),
};

export const transactionCriteriaSchemas = {
	address: orEqualCriteria(address),
	amount: orNumericCriteria(Joi.number().integer().min(0)),
	asset: orContainsCriteria(Joi.object()),
	blockId: orEqualCriteria(blockId),
	fee: orNumericCriteria(Joi.number().integer().min(0)),
	id: orEqualCriteria(Joi.string().hex().length(64)),
	nonce: orNumericCriteria(Joi.number().integer().positive()),
	recipientId: orEqualCriteria(address),
	senderId: orEqualCriteria(address),
	senderPublicKey: orEqualCriteria(Joi.string().hex().length(66)),
	sequence: orNumericCriteria(Joi.number().integer().positive()),
	timestamp: orNumericCriteria(Joi.number().integer().min(0)),
	type: orEqualCriteria(Joi.number().integer().min(0)),
	typeGroup: orEqualCriteria(Joi.number().integer().min(0)),
	vendorField: orLikeCriteria(Joi.string().max(255, "utf8")),
	version: orEqualCriteria(Joi.number().integer().positive()),
};
