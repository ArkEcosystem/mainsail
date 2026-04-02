import type { Contracts } from "@mainsail/contracts";
import type { AnySchemaObject, FuncKeywordDefinition } from "ajv";

import { BigNumber } from "@mainsail/utils";

export const makeKeywords = (
	configuration: Contracts.Crypto.Configuration,
): {
	network: FuncKeywordDefinition;
	transactionGasPrice: FuncKeywordDefinition;
	transactionGasLimit: FuncKeywordDefinition;
	bytecode: FuncKeywordDefinition;
} => {
	const network: FuncKeywordDefinition = {
		compile() {
			return (data) => {
				const chainId = configuration.get<number | undefined>("network.chainId");
				if (!chainId) {
					return true;
				}
				return data === chainId;
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
		compile() {
			// Used as lazy cache
			const genesisTransactionsLookup: Set<string> = new Set();

			return (data, parentSchema: AnySchemaObject) => {
				const {
					gas: { maximumGasPrice, minimumGasPrice },
				} = configuration.getMilestone();

				try {
					const value = BigNumber.make(data);
					if (value.isLessThan(minimumGasPrice)) {
						// Accept 0 gasFee when processing genesis block only
						if (!value.isZero()) {
							return false;
						}

						// The height check is needed for when e.g. the genesis block itself is being built.
						const height = configuration.getHeight();
						let valid = height === configuration.getGenesisHeight();

						// Otherwise lookup by transaction hash
						if (!valid && parentSchema && parentSchema.parentData && parentSchema.parentData.hash) {
							if (genesisTransactionsLookup.size === 0) {
								const genesisBlock =
									configuration.get<Contracts.Crypto.BlockJsonCrypto>("genesisBlock.block");
								for (const transaction of genesisBlock?.transactions || []) {
									genesisTransactionsLookup.add(transaction.hash);
								}
							}

							valid = genesisTransactionsLookup.has(parentSchema.parentData.hash);
						}

						return valid;
					}

					// The upper limit technically isn't needed and solely acts as a safeguard
					// as there's no legit reason to go beyond it.
					if (value.isGreaterThan(maximumGasPrice)) {
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
		compile() {
			return (data) => {
				const {
					gas: { maximumGasLimit, minimumGasLimit },
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
		compile() {
			return (data, parentSchema: AnySchemaObject) => {
				const {
					gas: { maximumGasLimit },
				} = configuration.getMilestone();

				if (typeof data !== "string") {
					return false;
				}

				// The allowed bytecode length is relative to the maximum transaction gas limit
				// and cost of non-zero calldata per gas (16 byte).
				const maxBytecodeLength = maximumGasLimit / 16;
				const minBytecodeLength = 0;

				const regex = new RegExp(`^(0x)[0-9a-fA-F]{${minBytecodeLength},${maxBytecodeLength}}$`);
				if (!regex.test(data)) {
					return false;
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
	};

	return {
		bytecode,
		network,
		transactionGasLimit,
		transactionGasPrice,
	};
};
