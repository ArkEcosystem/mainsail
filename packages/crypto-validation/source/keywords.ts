import type { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";
import type {  FuncKeywordDefinition } from "ajv";
import { parseBlockNumber } from "./parse-block-number.js";

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
		compile: (schema) => (data) => {
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
		compile(schema: { minimum?: number; blockNumberPath?: string }) {
			return (data, parentSchema) => {
				if (!Array.isArray(data)) {
					return false;
				}

				const blockNumber = parseBlockNumber(schema.blockNumberPath, parentSchema);
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
				blockNumberPath: { type: "string" },
				minimum: { type: "integer" },
			},
			type: "object",
		},
	};

	// Used by: crypto-messages (prevotes / precommits) and crypto-proposal
	const isValidatorIndex: FuncKeywordDefinition = {
		compile(schema: { blockNumberPath?: string }) {
			return (data, parentSchema) => {
				if (!Number.isInteger(data)) {
					return false;
				}

				if (data < 0) {
					return false;
				}

				const blockNumber = parseBlockNumber(schema.blockNumberPath, parentSchema);
				const { roundValidators } = configuration.getMilestone(blockNumber);

				return data < roundValidators;
			};
		},
		errors: false,
		metaSchema: {
		properties: {
			blockNumberPath: { type: "string" },
		},
		type: "object",
		},
		keyword: "isValidatorIndex",
	};

	return { bignumber, buffer, isValidatorIndex, limitToRoundValidators, maxBytes };
};
