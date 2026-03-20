import type { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";
import type { AnySchemaObject, FuncKeywordDefinition } from "ajv";

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


	// Use by: crypto-proposal, p2p
	const limitToRoundValidators: FuncKeywordDefinition = {
		// @ts-ignore
		compile(schema: { minimum?: number }) {
			return (data, parentSchema: AnySchemaObject) => {
				if (!Array.isArray(data)) {
					return false;
				}

				const { roundValidators } = configuration.getMilestone();
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

	// Used by: crypto-messages (prevotes / precommits) and crypto-proposal
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

				const { roundValidators } = configuration.getMilestone();

				return data < roundValidators;
			};
		},
		errors: false,
		keyword: "isValidatorIndex",
	};

	return { bignumber, buffer, isValidatorIndex, limitToRoundValidators, maxBytes };
};
