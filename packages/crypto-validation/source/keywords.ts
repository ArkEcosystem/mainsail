import type { Contracts } from "@mainsail/contracts";
import type { FuncKeywordDefinition } from "ajv";

import { parseBlockNumber } from "./parse-block-number.js";

export const makeKeywords = (
	configuration: Contracts.Crypto.Configuration,
): {
	bigInt: FuncKeywordDefinition;
	buffer: FuncKeywordDefinition;
	isValidatorIndex: FuncKeywordDefinition;
	limitToRoundValidators: FuncKeywordDefinition;
} => {
	const bigInt: FuncKeywordDefinition = {
		compile: (schema) => (data) => {
			const minimum = schema.minimum !== undefined ? schema.minimum : 0n;
			const maximum =
				schema.maximum !== undefined
					? schema.maximum
					: BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

			if (typeof data !== "bigint") {
				return false;
			}

			if (data < minimum) {
				return false;
			}

			if (data > maximum) {
				return false;
			}

			return true;
		},
		errors: false,
		keyword: "bigInt",
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
		keyword: "isValidatorIndex",
		metaSchema: {
			properties: {
				blockNumberPath: { type: "string" },
			},
			type: "object",
		},
	};

	return { bigInt, buffer, isValidatorIndex, limitToRoundValidators };
};
