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
				const chainId = configuration.get("network.chainId");
				if (!chainId) {
					return true;
				}
				return schema && data === chainId;
			};
		},
		errors: false,
		keyword: "network",
		metaSchema: {
			type: "boolean",
		},
	};

	const transactionGasPrice: FuncKeywordDefinition = {
		// @ts-ignore
		compile(schema) {
			// Used as lazy cache
			const genesisTransactionsLookup: Set<string> = new Set();

			return (data, parentSchema: AnySchemaObject) => {
				const {
					gas: { minimumGasPrice, maximumGasPrice },
				} = configuration.getMilestone();

				try {
					const bignum = BigNumber.make(data);
					if (bignum.isLessThan(minimumGasPrice)) {
						// Accept 0 gasFee when processing genesis block only
						if (!bignum.isZero()) {
							return false;
						}

						// The height check is needed for when e.g. the genesis block itself is being built.
						const height = configuration.getHeight();
						let valid = height === configuration.getGenesisHeight();

						// Otherwise lookup by transaction id
						if (!valid && parentSchema && parentSchema.parentData && parentSchema.parentData.id) {
							if (genesisTransactionsLookup.size === 0) {
								const genesisBlock = configuration.get<Contracts.Crypto.BlockData | undefined>(
									"genesisBlock.block",
								);
								for (const transaction of genesisBlock?.transactions || []) {
									genesisTransactionsLookup.add(transaction.id);
								}
							}

							valid = genesisTransactionsLookup.has(parentSchema.parentData.id);
						}

						return valid;
					}

					// The upper limit technically isn't needed and solely acts as a safeguard
					// as there's no legit reason to go beyond it.
					if (bignum.isGreaterThan(maximumGasPrice)) {
						return false;
					}
				} catch {
					return false;
				}

				return true;
			};
		},
		errors: false,
		keyword: "transactionGasPrice",
		metaSchema: {
			properties: {},
			type: "object",
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
		transactionGasLimit,
		transactionGasPrice,
		transactionType,
	};
};
