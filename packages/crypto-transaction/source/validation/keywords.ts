import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";
import { AnySchemaObject, FuncKeywordDefinition } from "ajv";

export const makeKeywords = (configuration: Contracts.Crypto.Configuration) => {
	const transactionType: FuncKeywordDefinition = {
		compile(schema) {
			return (data) => data === schema;
		},

		errors: false,
		keyword: "transactionType",
		metaSchema: {
			minimum: 0,
			type: "integer",
		},
	};

	const network: FuncKeywordDefinition = {
		compile(schema) {
			return (data) => {
				const networkHash = configuration.get("network.pubKeyHash");
				if (!networkHash) {
					return true;
				}
				return schema && data === networkHash;
			};
		},
		errors: false,
		keyword: "network",
		metaSchema: {
			type: "boolean",
		},
	};

	const transactionGasLimit: FuncKeywordDefinition = {
		// @ts-ignore
		compile(schema) {
			return (data) => {
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
		metaSchema: {
			properties: {},
			type: "object",
		},
		modifying: true,
	};

	return {
		bytecode,
		network,
		transactionType,
		transactionGasLimit,
	};
};
