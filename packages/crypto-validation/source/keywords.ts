import type { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";
import type { AnySchemaObject, FuncKeywordDefinition } from "ajv";

export const makeKeywords = (
	configuration: Contracts.Crypto.Configuration,
): { maxBytes: FuncKeywordDefinition; bignumber: FuncKeywordDefinition } => {
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

			if(!(data instanceof BigNumber)) {
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

	return { bignumber, maxBytes };
};
