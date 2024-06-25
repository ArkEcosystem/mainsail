import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";
import { AnySchemaObject, FuncKeywordDefinition } from "ajv";

export const makeKeywords = (configuration: Contracts.Crypto.Configuration) => {
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

	const bignum: FuncKeywordDefinition = {
		// TODO: Check type
		// @ts-ignore
		compile: (schema) => (data, parentSchema: AnySchemaObject) => {
			const minimum = schema.minimum !== undefined ? schema.minimum : 0;
			const maximum = schema.maximum !== undefined ? schema.maximum : "9223372036854775807"; // 8 byte maximum

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

	const transactionGasLimit: FuncKeywordDefinition = {
		// @ts-ignore
		compile(schema) {
			return (data, parentSchema: AnySchemaObject) => {
				const {
					gas: { minimumGasLimit, maximumGasLimit },
				} = configuration.getMilestone();

				try {
					const bignum = BigNumber.make(data);
					if (bignum.isLessThan(minimumGasLimit)) {
						return false;
					}

					if (bignum.isGreaterThan(maximumGasLimit)) {
						return false;
					}
				} catch {
					return false;
				}

				return true;
			};
		},
		errors: false,
		keyword: "transactionGasLimit",
		metaSchema: {
			properties: {},
			type: "object",
		},
	};

	const bytecode: FuncKeywordDefinition = {
		// @ts-ignore
		compile(schema) {
			return (data, parentSchema: AnySchemaObject) => {
				const {
					gas: { maximumGasLimit },
				} = configuration.getMilestone();

				if (typeof data !== "string") {
					return false;
				}

				// The allowed bytecode length is relative to the maximum transaction gas limit
				const maxBytecodeLength = maximumGasLimit / 2;
				const minBytecodeLength = 0;

				const regex = new RegExp(`^(0x)?[0-9a-fA-F]{${minBytecodeLength},${maxBytecodeLength}}$`);
				if (!regex.test(data)) {
					return false;
				}

				if (parentSchema && parentSchema.parentData && parentSchema.parentDataProperty) {
					parentSchema.parentData[parentSchema.parentDataProperty] = data.startsWith("0x")
						? data.slice(2)
						: data;
				}

				return true;
			};
		},
		errors: false,
		keyword: "bytecode",
		modifying: true,
		metaSchema: {
			properties: {},
			type: "object",
		},
	};

	return { bignum, bytecode, maxBytes, transactionGasLimit };
};
