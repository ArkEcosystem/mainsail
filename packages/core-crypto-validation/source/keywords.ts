import { Contracts } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";
import { AnySchemaObject, FuncKeywordDefinition } from "ajv";

let genesisTransactions;

const isGenesisTransaction = (configuration: Contracts.Crypto.IConfiguration, id: string) => {
	if (!configuration.get("genesisBlock.transactions")) {
		return true;
	}

	if (!genesisTransactions) {
		genesisTransactions = Object.fromEntries(
			configuration.get("genesisBlock.transactions").map((current) => [current.id, true]),
		);
	}

	return !!genesisTransactions[id];
};

export const makeKeywords = (configuration: Contracts.Crypto.IConfiguration) => {
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
		compile: (schema) => (data, parentSchema: AnySchemaObject) => {
			const minimum = typeof schema.minimum !== "undefined" ? schema.minimum : 0;
			const maximum = typeof schema.maximum !== "undefined" ? schema.maximum : "9223372036854775807"; // 8 byte maximum

			if (data !== 0 && !data) {
				return false;
			}

			let bignum: BigNumber;
			try {
				bignum = BigNumber.make(data);
			} catch {
				return false;
			}

			if (bignum.isLessThan(minimum)) {
				if (bignum.isZero() && schema.bypassGenesis && parentSchema.parentData?.id) {
					return isGenesisTransaction(configuration, parentSchema.parentData.id);
				} else {
					return false;
				}
			}

			if (bignum.isGreaterThan(maximum)) {
				return false;
			}

			return true;
		},
		errors: false,
		keyword: "bignumber",
		metaSchema: {
			properties: {
				block: { type: "boolean" },
				bypassGenesis: { type: "boolean" },
				maximum: { type: "integer" },
				minimum: { type: "integer" },
			},
			type: "object",
		},
		modifying: true,
	};

	return { bignum, maxBytes };
};
