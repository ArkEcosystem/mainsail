import type { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";
import type { AnySchemaObject, FuncKeywordDefinition } from "ajv";

const parseBlockNumber = (parentSchema): number | undefined => {
	if (!parentSchema || !parentSchema.parentData) {
		return undefined;
	}

	if (parentSchema.parentData.blockNumber) {
		// prevotes / precommits
		return parentSchema.parentData.blockNumber;
	}

	if (!parentSchema.parentData.data) {
		return undefined;
	}

	// Proposals contain the block only in serialized form (hex).
	// We can extract the block number at a fixed offset here, without needing to deserialize the whole block.

	// See packages/crypto-messages/source/serializer.ts#serializeProposed for reference.

	const serialized = parentSchema.parentData.data.serialized;
	if (!serialized) {
		return undefined;
	}

	if (serialized.length < 30) {
		return undefined;
	}

	const lockProofSize = 2 + Number.parseInt(serialized.slice(0, 2), 16) * 2;
	// version: 1 byte (2 hex)
	// timestamp: 6 bytes (12 hex)
	// blockNumber: 4 byte (8 hex)
	const offset = lockProofSize + 2 + 12;
	return Buffer.from(serialized.slice(offset, offset + 8), "hex").readUInt32LE();
};

export const makeKeywords = (
	configuration: Contracts.Crypto.Configuration,
): {
	maxBytes: FuncKeywordDefinition;
	bignumber: FuncKeywordDefinition;
	buffer: FuncKeywordDefinition;
	isValidatorIndex: FuncKeywordDefinition;
	limitToRoundValidators: FuncKeywordDefinition;
} => {
	const maxBytes: FuncKeywordDefinition = {
		compile: (schema) => (data) => Buffer.byteLength(data, "utf8") <= schema,
		errors: false,
		keyword: "maxBytes",
		metaSchema: {
			minimum: 0,
			type: "integer",
		},
		type: "string",
	};

	const bignumber: FuncKeywordDefinition = {
		// @ts-ignore
		compile: (schema) => (data, parentSchema: AnySchemaObject) => {
			const minimum = schema.minimum !== undefined ? schema.minimum : 0;
			const maximum = schema.maximum !== undefined ? schema.maximum : BigNumber.UINT256_MAX;

			if (!(data instanceof BigNumber)) {
				return false;
			}

			if (data.isLessThan(minimum)) {
				return false;
			}

			if (data.isGreaterThan(maximum)) {
				return false;
			}

			return true;
		},
		errors: false,
		keyword: "bignumber",
		metaSchema: {
			properties: {
				maximum: { type: "integer" },
				minimum: { type: "integer" },
			},
			type: "object",
		},
	};

	const buffer: FuncKeywordDefinition = {
		compile() {
			return (data) => Buffer.isBuffer(data);
		},
		errors: false,
		keyword: "buffer",
	};

	const limitToRoundValidators: FuncKeywordDefinition = {
		// TODO: Check type (same as bignum)
		// @ts-ignore
		compile(schema: { minimum?: number }) {
			return (data, parentSchema: AnySchemaObject) => {
				if (!Array.isArray(data)) {
					return false;
				}

				const blockNumber = parseBlockNumber(parentSchema);
				const { roundValidators } = configuration.getMilestone(blockNumber);
				const minimum = schema.minimum !== undefined ? schema.minimum : roundValidators;

				if (data.length < minimum || data.length > roundValidators) {
					return false;
				}

				return true;
			};
		},
		errors: false,
		keyword: "limitToRoundValidators",
		metaSchema: {
			properties: {
				minimum: { type: "integer" },
			},
			type: "object",
		},
	};

	const isValidatorIndex: FuncKeywordDefinition = {
		// @ts-ignore
		compile() {
			return (data, parentSchema: AnySchemaObject) => {
				if (!Number.isInteger(data)) {
					return false;
				}

				if (data < 0) {
					return false;
				}

				const blockNumber = parseBlockNumber(parentSchema);
				const { roundValidators } = configuration.getMilestone(blockNumber);

				return data < roundValidators;
			};
		},
		errors: false,
		keyword: "isValidatorIndex",
	};

	return { bignumber, buffer, isValidatorIndex, limitToRoundValidators, maxBytes };
};
