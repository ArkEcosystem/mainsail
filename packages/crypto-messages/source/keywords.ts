import { Contracts } from "@mainsail/contracts";
import { AnySchemaObject, FuncKeywordDefinition } from "ajv";

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

export const makeKeywords = (configuration: Contracts.Crypto.Configuration) => {
	const limitToActiveValidators: FuncKeywordDefinition = {
		// TODO: Check type (same as bignum)
		// @ts-ignore
		compile(schema) {
			return (data, parentSchema: AnySchemaObject) => {
				if (!Array.isArray(data)) {
					return false;
				}

				const blockNumber = parseBlockNumber(parentSchema);
				const { activeValidators } = configuration.getMilestone(blockNumber);
				const minimum = schema.minimum !== undefined ? schema.minimum : activeValidators;

				if (data.length < minimum || data.length > activeValidators) {
					return false;
				}

				return true;
			};
		},
		errors: false,
		keyword: "limitToActiveValidators",
		metaSchema: {
			properties: {
				minimum: { type: "integer" },
			},
			type: "object",
		},
	};

	const isValidatorIndex: FuncKeywordDefinition = {
		// TODO: Check type (same as bignum)
		// @ts-ignore
		compile() {
			return (data, parentSchema: AnySchemaObject) => {
				const blockNumber = parseBlockNumber(parentSchema);
				const { activeValidators } = configuration.getMilestone(blockNumber);

				if (!Number.isInteger(data)) {
					return false;
				}

				return data >= 0 && data < activeValidators;
			};
		},
		errors: false,
		keyword: "isValidatorIndex",
		metaSchema: {
			type: "object",
		},
	};

	return {
		isValidatorIndex,
		limitToActiveValidators,
	};
};
