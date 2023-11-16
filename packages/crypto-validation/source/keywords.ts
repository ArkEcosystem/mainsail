import { BigNumber } from "@mainsail/utils";
import { AnySchemaObject, FuncKeywordDefinition } from "ajv";

export const makeKeywords = () => {
	const maxBytes: FuncKeywordDefinition = {
		compile: (schema) => (data) => Buffer.from(data, "utf8").byteLength <= schema,
		errors: false,
		keyword: "maxBytes",
		metaSchema: {
			minimum: 0,
			type: "integer",
		},
		type: "string",
	};

	const bignum: FuncKeywordDefinition = {
		// TODO: Check type
		// @ts-ignore
		compile: (schema) => (data, parentSchema: AnySchemaObject) => {
			const minimum = typeof schema.minimum !== "undefined" ? schema.minimum : 0;
			const maximum = typeof schema.maximum !== "undefined" ? schema.maximum : "9223372036854775807"; // 8 byte maximum

			if (data !== 0 && !data) {
				return false;
			}

			try {
				const bignum = BigNumber.make(data);

				if (bignum.isLessThan(minimum)) {
					return false;
				}

				if (bignum.isGreaterThan(maximum)) {
					return false;
				}
			} catch {
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

	return { bignum, maxBytes };
};
