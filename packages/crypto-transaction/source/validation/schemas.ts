import { SchemaObject } from "ajv";

const transactionHash: SchemaObject = {
	$id: "transactionHash",
	allOf: [{ maxLength: 64, minLength: 64 }, { $ref: "hex" }],
	type: "string",
};

const prefixedTransactionHash: SchemaObject = {
	$id: "prefixedTransactionHash",
	allOf: [{ maxLength: 66, minLength: 66 }, { $ref: "prefixedQuantityHex" }],
	type: "string",
};

const networkByte: SchemaObject = {
	$id: "networkByte",
	network: true,
};

export const schemas = {
	networkByte,
	prefixedTransactionHash,
	transactionHash,
};

export const transactionBaseSchema: SchemaObject = {
	properties: {
		from: { $ref: "address" },
		gasLimit: { transactionGasLimit: {} },
		gasPrice: { transactionGasPrice: {} },

		hash: { $ref: "transactionHash" },

		// Legacy
		legacySecondSignature: {
			allOf: [{ maxLength: 130, minLength: 130 }, { $ref: "alphanumeric" }],
			type: "string",
		},

		network: { $ref: "networkByte" },

		nonce: { bignumber: { minimum: 0 } },

		r: { $ref: "hex" },
		s: { $ref: "hex" },

		senderLegacyAddress: { type: "string" },

		senderPublicKey: { $ref: "publicKey" },

		v: { maximum: 1, minimum: 0, type: "number" },
		value: { bignumber: { maximum: undefined, minimum: 0 } },
	},
	required: ["network", "from", "senderPublicKey", "gasPrice", "gasLimit", "value", "nonce"],
	type: "object",
};
